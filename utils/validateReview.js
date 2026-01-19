const ExpressError = require('./ExpressError');
const { reviewSchema } = require('../schemas');

const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body.review);
    if (error) {
        const msg = error.details.map(el => el.message).join(',');
        throw new ExpressError(400, msg);
    } else {
        next();
    }
};

module.exports = validateReview;