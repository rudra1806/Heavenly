/**
 * Joi validation for booking data.
 */

const Joi = require('joi');

const bookingSchema = Joi.object({
    listingId: Joi.string().required()
        .messages({ 'any.required': 'Listing ID is required' }),
    checkIn: Joi.date().iso().required()
        .messages({ 'any.required': 'Check-in date is required' }),
    checkOut: Joi.date().iso().greater(Joi.ref('checkIn')).required()
        .messages({
            'any.required': 'Check-out date is required',
            'date.greater': 'Check-out must be after check-in'
        }),
    guests: Joi.number().integer().min(1).required()
        .messages({
            'number.min': 'At least 1 guest is required',
            'any.required': 'Number of guests is required'
        })
});

function validateBooking(req, res, next) {
    const { error } = bookingSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const message = error.details.map(el => el.message).join(', ');
        return res.status(400).json({ success: false, error: message });
    }
    next();
}

module.exports = validateBooking;
