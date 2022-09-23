const express = require('express');
const morgan = require('morgan');
const cookierParser = require('cookie-parser');

const globalErrorHandler = require('./controllers/errorController');
const postRouter = require('./routes/postRoutes');
const topicRouter = require('./routes/topicRoutes');
const commentRouter = require('./routes/commentRoutes');
const userRouter = require('./routes/userRoutes');

const app = express();

// Logging http request in development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(cookierParser());
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Routes
app.use('/api/v1/posts', postRouter);
app.use('/api/v1/topics', topicRouter);
app.use('/api/v1/comments', commentRouter);
app.use('/api/v1/users', userRouter);

// Global error handler
app.use(globalErrorHandler);

module.exports = app;

/*
TODO:
updating likes --> store id in likes?
custom route for toggling likes? (if likes contains uid ? remove uid : add uid)

add verifyOwner to comment, post, ..?
custom route for updating comment/post, accepting only certain fields

add route for getting post comments

route for user updateMe

add security stuff
*/
