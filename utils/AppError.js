class AppError extends Error {
  constructor(message, statusCode, errorData = null) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    if (errorData) {
      this.errorData = { ...errorData };
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
