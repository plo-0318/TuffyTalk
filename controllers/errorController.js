const AppError = require('../utils/AppError');

const handleJWTTokenError = () => {
  return new AppError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('Token expired. Please log in again.', 401);
};

const handleDuplicateFieldError = (err) => {
  let field = Object.keys(err.keyValue)[0];
  field = field.charAt(0).toUpperCase() + field.slice(1);

  return new AppError(`${field} is already in use`, 400, {
    type: 'duplication',
    field,
    message: `${field} is already in use`,
  });
};

const handleValidationErrorDB = (err) => {
  const field = Object.keys(err.errors)[0];
  const message = err.errors[field].message;

  return new AppError(`Validation: ${message}`, 400, {
    type: 'validation',
    field,
    message,
  });
};

const sendErrorDev = (err, req, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, req, res) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      errorData: err.errorData || null,
    });
  }

  console.error(err);

  res.status(500).json({
    status: 'ERROR',
    message: 'Something went very wrong 🤦‍♂️',
  });
};

const globalErrorHandler = (err, req, res, next) => {
  let error = { ...err };

  console.log('\n');
  console.log('🤬🤬🤬🤬🤬', err.name);
  console.log(err);
  console.log('\n');

  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'ERROR';
  error.message = err.message || 'Something went very wrong 🤦‍♂️';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    // JWT malformed error
    if (err.name === 'JsonWebTokenError') error = handleJWTTokenError();

    // JWT expired error
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    // DB Duplicate field error
    if (err.code === 11000) error = handleDuplicateFieldError(err);

    // DB validation error
    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);

    sendErrorProd(error, req, res);
  }
};

module.exports = globalErrorHandler;
