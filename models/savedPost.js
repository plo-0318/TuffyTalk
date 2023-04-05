const mongoose = require('mongoose');

const savedPostSchema = mongoose.Schema({
  type: {
    type: String,
    required: [true, 'A saved post must have a type'],
    enum: {
      values: ['bookmark', 'like'],
      messages: 'A saved post type must either be bookmark or like',
    },
  },
  user: {
    type: mongoose.Schema.ObjectId,
    required: [true, 'A saved post must belong to a user'],
    ref: 'User',
  },

  post: {
    type: mongoose.Schema.ObjectId,
    required: [true, 'A saved post must contain a post'],
    ref: 'Post',
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
  postCreatedAt: {
    type: Date,
    default: new Date(),
  },
});

savedPostSchema.index({ user: 1, post: 1, type: 1 }, { unique: true });

const SavedPost = mongoose.model('SavedPost', savedPostSchema);

module.exports = SavedPost;
