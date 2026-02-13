const { bookingSchema } = require('../schemas.js');
const ExpressError = require('./ExpressError.js');

module.exports = (req, res, next) => {
    const { error } = bookingSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
        const msg = error.details.map(el => el.message).join(', ');
        throw new ExpressError(400, msg);
    } else {
        next();
    }
};
