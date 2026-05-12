/**
 * Joi validation schema for listing data.
 * Migrated from the monolith's schemas.js — listing portion only.
 */

const Joi = require('joi');

const listingSchema = Joi.object({
    title: Joi.string().trim().min(3).max(100).required()
        .messages({
            'string.empty': 'Title is required',
            'string.min': 'Title must be at least 3 characters',
            'string.max': 'Title cannot exceed 100 characters'
        }),
    description: Joi.string().trim().min(10).max(1000).required()
        .messages({
            'string.empty': 'Description is required',
            'string.min': 'Description must be at least 10 characters',
            'string.max': 'Description cannot exceed 1000 characters'
        }),
    price: Joi.number().positive().required()
        .messages({
            'number.base': 'Price must be a number',
            'number.positive': 'Price must be a positive number',
            'any.required': 'Price is required'
        }),
    location: Joi.string().trim().min(2).max(100).required()
        .messages({
            'string.empty': 'Location is required',
            'string.min': 'Location must be at least 2 characters'
        }),
    country: Joi.string().trim().min(2).max(60).required()
        .messages({
            'string.empty': 'Country is required',
            'string.min': 'Country must be at least 2 characters'
        }),
    maxGuests: Joi.number().integer().min(1).max(50).optional()
        .messages({
            'number.base': 'Maximum guests must be a number',
            'number.min': 'Must allow at least 1 guest',
            'number.max': 'Cannot exceed 50 guests'
        }),
    image: Joi.object({
        url: Joi.string().trim().uri().allow('').messages({ 'string.uri': 'Image URL must be a valid URL' }),
        filename: Joi.string().trim().allow('')
    }).optional(),
    geometry: Joi.object({
        type: Joi.string().valid('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2)
    }).optional()
});

/**
 * Express middleware to validate listing request body.
 */
function validateListing(req, res, next) {
    const { error } = listingSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const message = error.details.map(el => el.message).join(', ');
        return res.status(400).json({ success: false, error: message });
    }
    next();
}

module.exports = validateListing;
