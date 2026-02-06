const Joi = require('joi');

// Listing validation schema
const listingSchema = Joi.object({
    title: Joi.string()
        .trim()
        .min(3)
        .max(100)
        .required()
        .messages({
            'string.empty': 'Title is required',
            'string.min': 'Title must be at least 3 characters',
            'string.max': 'Title cannot exceed 100 characters'
        }),
    
    description: Joi.string()
        .trim()
        .min(10)
        .max(1000)
        .required()
        .messages({
            'string.empty': 'Description is required',
            'string.min': 'Description must be at least 10 characters',
            'string.max': 'Description cannot exceed 1000 characters'
        }),
    
    price: Joi.number()
        .positive()
        .required()
        .messages({
            'number.base': 'Price must be a number',
            'number.positive': 'Price must be a positive number',
            'any.required': 'Price is required'
        }),
    
    location: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.empty': 'Location is required',
            'string.min': 'Location must be at least 2 characters'
        }),
    
    country: Joi.string()
        .trim()
        .min(2)
        .max(60)
        .required()
        .messages({
            'string.empty': 'Country is required',
            'string.min': 'Country must be at least 2 characters'
        }),
    
    image: Joi.object({
        url: Joi.string()
            .trim()
            .uri()
            .allow('')
            .messages({
                'string.uri': 'Image URL must be a valid URL'
            }),
        filename: Joi.string()
            .trim()
            .allow('')
    }).optional(),

    // Geometry is set server-side by geocoding, allow it to pass validation
    geometry: Joi.object({
        type: Joi.string().valid('Point'),
        coordinates: Joi.array().items(Joi.number()).length(2)
    }).optional()
});

const reviewSchema = Joi.object({
    rating: Joi.number()
        .min(1)
        .max(5)
        .required()
        .messages({
            'number.base': 'Rating must be a number',
            'number.min': 'Rating must be at least 1',
            'number.max': 'Rating cannot exceed 5',
            'any.required': 'Rating is required'
        }),
    
    comment: Joi.string()
        .trim()
        .min(5)
        .max(500)
        .required()
        .messages({
            'string.empty': 'Comment is required',
            'string.min': 'Comment must be at least 5 characters',
            'string.max': 'Comment cannot exceed 500 characters'
        })
});


module.exports = { listingSchema, reviewSchema };