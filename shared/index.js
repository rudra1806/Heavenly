const authMiddleware = require('./middleware/authMiddleware');
const AppError = require('./errors/AppError');
const { connectRabbitMQ, publishEvent, consumeEvent, closeRabbitMQ } = require('./events/broker');
const eventNames = require('./events/eventNames');
const serviceClient = require('./utils/serviceClient');

module.exports = {
    authMiddleware,
    AppError,
    connectRabbitMQ,
    publishEvent,
    consumeEvent,
    closeRabbitMQ,
    eventNames,
    serviceClient
};
