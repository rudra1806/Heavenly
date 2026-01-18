// this utility function wraps async route handlers to catch errors and pass them to next()

const wrapAsync = (fn) => {
    return function(req, res, next) {
        fn(req, res, next).catch(next);
    }
};

module.exports = wrapAsync;