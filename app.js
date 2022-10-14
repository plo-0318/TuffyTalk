const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cookierParser = require('cookie-parser');
const cors = require('cors');

const globalErrorHandler = require('./controllers/errorController');
const postRouter = require('./routes/postRoutes');
const majorRouter = require('./routes/majorRoutes');
const topicRouter = require('./routes/topicRoutes');
const commentRouter = require('./routes/commentRoutes');
const userRouter = require('./routes/userRoutes');
const userActionRouter = require('./routes/userActionRoutes');
const AppError = require('./utils/AppError');

const app = express();

// Storing the root path in global variable
global.appRoot = path.resolve(__dirname);

// Logging http request in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

app.use(cors({ credentials: true, origin: true }));
// app.set('trust proxy', 1);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(cookierParser());
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

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

/*
TODO:
add security stuff
*/
