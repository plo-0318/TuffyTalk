const AppError = require('../utils/AppError');

const handleJWTTokenError = () => {
  return new AppError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('Token expired. Please log in again.', 401);
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

    sendErrorProd(error, req, res);
  }
};

module.exports = globalErrorHandler;
