const mongoose = require('mongoose');

const likedCommentSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    required: [true, 'A liked comment must belong to a user'],
    ref: 'User',
  },
  comment: {
    type: mongoose.Schema.ObjectId,
    required: [true, 'A liked comment must contain a comment'],
    ref: 'Comment',
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
  commentCreatedAt: {
    type: Date,
    default: new Date(),
  },
});

likedCommentSchema.index({ user: 1, comment: 1 }, { unique: true });

const LikedComment = mongoose.model('LikedComment', likedCommentSchema);

module.exports = LikedComment;
