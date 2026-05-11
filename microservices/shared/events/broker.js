/**
 * RabbitMQ message broker client for event-driven communication.
 * 
 * Architecture:
 *   - Uses a TOPIC exchange ("heavenly.events") for flexible routing
 *   - Publishers send events with routing keys like "user.deleted"
 *   - Consumers bind queues with patterns like "user.*" or "listing.deleted"
 *   - Each consumer gets a durable queue (survives broker restarts)
 * 
 * Resilience:
 *   - Automatic reconnection with exponential backoff on connection loss
 *   - Consumer re-subscription after reconnection
 *   - Graceful handling of channel errors
 * 
 * Why Topic Exchange?
 *   - Allows consumers to subscribe to specific events OR wildcards
 *   - e.g., Review Service can listen to both "listing.deleted" AND "user.deleted"
 *   - More flexible than direct/fanout exchanges
 * 
 * Usage:
 *   // Publisher (e.g., Auth Service)
 *   await connectRabbitMQ('amqp://localhost');
 *   await publishEvent('user.deleted', { userId: '123' });
 * 
 *   // Consumer (e.g., Listing Service)
 *   await connectRabbitMQ('amqp://localhost');
 *   await consumeEvent('listing-service.user-deleted', 'user.deleted', async (data) => {
 *       await Listing.deleteMany({ ownerId: data.userId });
 *   });
 */

const amqplib = require('amqplib');
const eventNames = require('./eventNames');

let connection = null;
let channel = null;
let connectionUrl = null;    // Store URL for reconnection
let isReconnecting = false;  // Prevent concurrent reconnection attempts

// Store consumer registrations so they can be re-subscribed after reconnect
const registeredConsumers = [];

/**
 * Establishes connection to RabbitMQ and creates a channel.
 * Also declares the topic exchange.
 * 
 * Includes retry logic for container startup ordering:
 * RabbitMQ might not be ready when services start.
 * 
 * @param {string} url - AMQP connection URL
 * @param {number} retries - Number of connection attempts
 * @param {number} delay - Delay between retries in ms
 */
async function connectRabbitMQ(url, retries = 5, delay = 5000) {
    connectionUrl = url; // Store for reconnection

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`[RabbitMQ] Connection attempt ${attempt}/${retries}...`);
            connection = await amqplib.connect(url);
            channel = await connection.createChannel();

            // Declare the topic exchange (idempotent — safe to call multiple times)
            // durable: true ensures the exchange survives broker restarts
            await channel.assertExchange(eventNames.EXCHANGE, 'topic', {
                durable: true
            });

            console.log('[RabbitMQ] Connected successfully');

            // Handle unexpected disconnections with automatic reconnect
            connection.on('error', (err) => {
                console.error('[RabbitMQ] Connection error:', err.message);
            });
            connection.on('close', () => {
                console.warn('[RabbitMQ] Connection closed unexpectedly.');
                connection = null;
                channel = null;
                scheduleReconnect();
            });

            // Handle channel errors (e.g., protocol violation) — reconnect channel
            channel.on('error', (err) => {
                console.error('[RabbitMQ] Channel error:', err.message);
            });
            channel.on('close', () => {
                console.warn('[RabbitMQ] Channel closed unexpectedly.');
                channel = null;
                // If connection is still alive, just recreate the channel
                if (connection) {
                    recreateChannel();
                }
            });

            return channel;
        } catch (err) {
            console.error(`[RabbitMQ] Attempt ${attempt} failed:`, err.message);
            if (attempt < retries) {
                console.log(`[RabbitMQ] Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw new Error(`[RabbitMQ] Failed to connect after ${retries} attempts`);
            }
        }
    }
}

/**
 * Recreates the channel on an existing connection and re-subscribes consumers.
 */
async function recreateChannel() {
    try {
        if (!connection) return;
        channel = await connection.createChannel();
        await channel.assertExchange(eventNames.EXCHANGE, 'topic', { durable: true });

        channel.on('error', (err) => {
            console.error('[RabbitMQ] Channel error:', err.message);
        });
        channel.on('close', () => {
            console.warn('[RabbitMQ] Channel closed. Recreating...');
            channel = null;
            if (connection) recreateChannel();
        });

        console.log('[RabbitMQ] Channel recreated successfully');
        await resubscribeConsumers();
    } catch (err) {
        console.error('[RabbitMQ] Failed to recreate channel:', err.message);
        // If channel recreation fails, try full reconnect
        connection = null;
        channel = null;
        scheduleReconnect();
    }
}

/**
 * Schedules an automatic reconnection attempt with exponential backoff.
 */
function scheduleReconnect() {
    if (isReconnecting || !connectionUrl) return;
    isReconnecting = true;

    const reconnect = async (attempt = 1, maxAttempts = 10) => {
        const delay = Math.min(5000 * Math.pow(2, attempt - 1), 60000); // Max 60s delay
        console.log(`[RabbitMQ] Reconnecting in ${delay / 1000}s (attempt ${attempt}/${maxAttempts})...`);

        await new Promise(resolve => setTimeout(resolve, delay));

        try {
            await connectRabbitMQ(connectionUrl, 1, 0);
            await resubscribeConsumers();
            isReconnecting = false;
            console.log('[RabbitMQ] Reconnected and consumers re-subscribed');
        } catch (err) {
            console.error(`[RabbitMQ] Reconnect attempt ${attempt} failed:`, err.message);
            if (attempt < maxAttempts) {
                await reconnect(attempt + 1, maxAttempts);
            } else {
                console.error('[RabbitMQ] All reconnection attempts exhausted. Manual restart required.');
                isReconnecting = false;
            }
        }
    };

    reconnect();
}

/**
 * Re-subscribes all previously registered consumers after a reconnection.
 */
async function resubscribeConsumers() {
    if (registeredConsumers.length === 0) return;

    console.log(`[RabbitMQ] Re-subscribing ${registeredConsumers.length} consumers...`);
    for (const consumer of registeredConsumers) {
        try {
            await setupConsumer(consumer.queueName, consumer.routingKey, consumer.handler);
            console.log(`[RabbitMQ] Re-subscribed: ${consumer.queueName} ← ${consumer.routingKey}`);
        } catch (err) {
            console.error(`[RabbitMQ] Failed to re-subscribe ${consumer.queueName}:`, err.message);
        }
    }
}

/**
 * Publishes an event to the topic exchange.
 * 
 * @param {string} routingKey - Event name (e.g., 'user.deleted')
 * @param {object} data - Event payload (will be JSON serialized)
 */
async function publishEvent(routingKey, data) {
    if (!channel) {
        console.error('[RabbitMQ] Cannot publish — not connected');
        return;
    }

    try {
        const message = Buffer.from(JSON.stringify({
            event: routingKey,
            data,
            timestamp: new Date().toISOString()
        }));

        channel.publish(eventNames.EXCHANGE, routingKey, message, {
            persistent: true,       // Survives broker restart
            contentType: 'application/json'
        });

        console.log(`[RabbitMQ] Published: ${routingKey}`, data);
    } catch (err) {
        console.error(`[RabbitMQ] Publish error for ${routingKey}:`, err.message);
    }
}

/**
 * Internal: sets up a single consumer on the current channel.
 * Used by both consumeEvent and resubscribeConsumers.
 */
async function setupConsumer(queueName, routingKey, handler) {
    if (!channel) {
        console.error('[RabbitMQ] Cannot consume — not connected');
        return;
    }

    // Durable queue — survives broker restarts, messages won't be lost
    await channel.assertQueue(queueName, { durable: true });

    // Bind queue to exchange with routing key pattern
    await channel.bindQueue(queueName, eventNames.EXCHANGE, routingKey);

    // Process one message at a time (prevents overwhelming the service)
    await channel.prefetch(1);

    channel.consume(queueName, async (msg) => {
        if (!msg) return;

        try {
            const content = JSON.parse(msg.content.toString());
            console.log(`[RabbitMQ] Received: ${routingKey}`, content.data);

            // Execute the handler with the event data
            await handler(content.data, content);

            // Acknowledge successful processing — removes message from queue
            channel.ack(msg);
        } catch (err) {
            console.error(`[RabbitMQ] Handler error for ${queueName}:`, err.message);
            // Negative acknowledge — requeue the message for retry
            // requeue: false sends to dead letter queue (if configured)
            channel.nack(msg, false, true);
        }
    });
}

/**
 * Subscribes to events from the topic exchange.
 * 
 * Creates a durable queue bound to the specified routing key pattern.
 * Queue names should be unique per service+event combination.
 * 
 * Consumer registrations are stored for automatic re-subscription after reconnect.
 * 
 * @param {string} queueName - Unique queue name (e.g., 'listing-service.user-deleted')
 * @param {string} routingKey - Event pattern to subscribe to (e.g., 'user.deleted' or 'listing.*')
 * @param {function} handler - Async function called with parsed event data
 */
async function consumeEvent(queueName, routingKey, handler) {
    // Store the registration for reconnection
    const existing = registeredConsumers.find(
        c => c.queueName === queueName && c.routingKey === routingKey
    );
    if (!existing) {
        registeredConsumers.push({ queueName, routingKey, handler });
    }

    try {
        await setupConsumer(queueName, routingKey, handler);
        console.log(`[RabbitMQ] Consuming: ${queueName} ← ${routingKey}`);
    } catch (err) {
        console.error(`[RabbitMQ] Consume setup error for ${queueName}:`, err.message);
    }
}

/**
 * Gracefully closes the RabbitMQ connection.
 * Call this during service shutdown.
 */
async function closeRabbitMQ() {
    try {
        // Prevent reconnection during shutdown
        connectionUrl = null;
        isReconnecting = false;

        if (channel) {
            await channel.close();
            channel = null;
        }
        if (connection) {
            await connection.close();
            connection = null;
        }
        console.log('[RabbitMQ] Connection closed gracefully');
    } catch (err) {
        console.error('[RabbitMQ] Error closing connection:', err.message);
    }
}

module.exports = {
    connectRabbitMQ,
    publishEvent,
    consumeEvent,
    closeRabbitMQ
};
