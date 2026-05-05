/**
 * RabbitMQ message broker client for event-driven communication.
 * 
 * Architecture:
 *   - Uses a TOPIC exchange ("heavenly.events") for flexible routing
 *   - Publishers send events with routing keys like "user.deleted"
 *   - Consumers bind queues with patterns like "user.*" or "listing.deleted"
 *   - Each consumer gets a durable queue (survives broker restarts)
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

            // Handle unexpected disconnections
            connection.on('error', (err) => {
                console.error('[RabbitMQ] Connection error:', err.message);
            });
            connection.on('close', () => {
                console.warn('[RabbitMQ] Connection closed. Will attempt reconnect on next operation.');
                connection = null;
                channel = null;
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
 * Subscribes to events from the topic exchange.
 * 
 * Creates a durable queue bound to the specified routing key pattern.
 * Queue names should be unique per service+event combination.
 * 
 * @param {string} queueName - Unique queue name (e.g., 'listing-service.user-deleted')
 * @param {string} routingKey - Event pattern to subscribe to (e.g., 'user.deleted' or 'listing.*')
 * @param {function} handler - Async function called with parsed event data
 */
async function consumeEvent(queueName, routingKey, handler) {
    if (!channel) {
        console.error('[RabbitMQ] Cannot consume — not connected');
        return;
    }

    try {
        // Durable queue — survives broker restarts, messages won't be lost
        await channel.assertQueue(queueName, { durable: true });

        // Bind queue to exchange with routing key pattern
        await channel.bindQueue(queueName, eventNames.EXCHANGE, routingKey);

        // Process one message at a time (prevents overwhelming the service)
        await channel.prefetch(1);

        console.log(`[RabbitMQ] Consuming: ${queueName} ← ${routingKey}`);

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
