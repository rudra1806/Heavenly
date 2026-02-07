const { listingSchema } = require('../schemas');
const ExpressError = require('./ExpressError');

// Middleware to validate listing data using Joi
const validateListing = (req, res, next) => {
    const { error } = listingSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
        // If validation fails and an image was uploaded, clean it up from Cloudinary
        if (req.file && req.file.filename) {
            const { cloudinary } = require('../cloudConfig.js');
            cloudinary.uploader.destroy(req.file.filename).catch(err => {
                console.error('Failed to cleanup orphaned upload:', err.message);
            });
        }
        // Join all error messages
        const message = error.details.map(el => el.message).join(', ');
        throw new ExpressError(400, message);
    }
    next();
};

module.exports = validateListing;
