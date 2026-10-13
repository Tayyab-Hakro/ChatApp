const AppError = require('../utils/AppError');

module.exports = function validate(schema, property = 'body') {
  return function validationMiddleware(req, _res, next) {
    const result = schema.safeParse(req[property]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      return next(new AppError(400, 'Request validation failed', 'VALIDATION_ERROR', details));
    }
    req[property] = result.data;
    return next();
  };
};
