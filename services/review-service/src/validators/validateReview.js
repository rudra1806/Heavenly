/**
 * Joi validation for review data.
 */

const Joi = require('joi');

const reviewSchema = Joi.object({
    comment: Joi.string().trim().min(5).max(500).required()
        .messages({
            'string.empty': 'Comment is required',
            'string.min': 'Comment must be at least 5 characters',
            'string.max': 'Comment cannot exceed 500 characters'
        }),
    rating: Joi.number().integer().min(1).max(5).required()
        .messages({
            'number.base': 'Rating must be a number',
            'number.min': 'Rating must be at least 1',
            'number.max': 'Rating cannot exceed 5',
            'any.required': 'Rating is required'
        }),
    listingId: Joi.string().required()
        .messages({ 'any.required': 'Listing ID is required' })
});

function validateReview(req, res, next) {
    const { error } = reviewSchema.validate(req.body, { abortEarly: false });
    if (error) {
        const message = error.details.map(el => el.message).join(', ');
        return res.status(400).json({ success: false, error: message });
    }
    next();
}

module.exports = validateReview;
