const { listingSchema } = require('../schemas');
const ExpressError = require('./ExpressError');

// Middleware to validate listing data using Joi
const validateListing = (req, res, next) => {
    const { error } = listingSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
        // Join all error messages
        const message = error.details.map(el => el.message).join(', ');
        throw new ExpressError(400, message);
    }
    next();
};

module.exports = validateListing;
