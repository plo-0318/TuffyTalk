const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cookierParser = require('cookie-parser');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');

const globalErrorHandler = require('./controllers/errorController');
const postRouter = require('./routes/postRoutes');
const majorRouter = require('./routes/majorRoutes');
const topicRouter = require('./routes/topicRoutes');
const commentRouter = require('./routes/commentRoutes');
const userRouter = require('./routes/userRoutes');
const userActionRouter = require('./routes/userActionRoutes');
const AppError = require('./utils/AppError');

const app = express();
app.enable('trust proxy');

// Storing the root path in global variable
global.appRoot = path.resolve(__dirname);

// Logging http request in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// CORS
app.use(function (req, res, next) {
  res.set('credentials', 'include');
  res.set('Access-Control-Allow-Credentials', true);
  res.set('Access-Control-Allow-Origin', req.headers.origin);
  res.set('Access-Control-Allow-Methods', 'GET,POST,DELETE,PATCH');
  res.set(
    'Access-Control-Allow-Headers',
    'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept'
  );
  next();
});

app.use(cors({ credentials: true, origin: true }));
app.options('*', cors());

// Limit request from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour.',
});
// app.use('/api', limiter);  //TODO: enable for prod?

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
app.use(helmet());

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(cookierParser());
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
// app.use(xss());

// Compression
app.use(compression());

// Routes
app.use('/api/v1/posts', postRouter);
app.use('/api/v1/topics', topicRouter);
app.use('/api/v1/majors', majorRouter);
app.use('/api/v1/comments', commentRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/user-actions', userActionRouter);
app.use('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global error handler
app.use(globalErrorHandler);

module.exports = app;
