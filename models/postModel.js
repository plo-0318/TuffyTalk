const mongoose = require('mongoose');
const util = require('../utils/util');

const postSchema = mongoose.Schema({
  topic: {
    type: mongoose.Schema.ObjectId,
    ref: 'Topic',
    required: [true, 'A post must belong to a topic'],
  },
  title: {
    type: String,
    required: [true, 'A post must have a title.'],
    maxLength: [50, 'A post title cannot exceeds 50 characters.'],
    minLength: [3, 'A post title needs to be at least 3 characters.'],
    trim: true,
  },
  content: {
    type: String,
    required: [true, 'A post must have a content.'],
    maxLength: [1000, 'A post content cannot exceeds 500 characters.'],
    minLength: [3, 'A post content needs to be at least 3 characters.'],
  },
  images: {
    type: [String],
    validate: {
      validator: function (val) {
        val.length <= 10;
      },
      message: 'A post can only contain 10 images.',
    },
  },
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'A post must have an author'],
  },
  likes: {
    type: Number,
    default: 0,
  },
  comments: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Comment',
      required: false,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  updatedAt: {
    type: Date,
  },
  modified: {
    type: Boolean,
    default: false,
  },
});

/////////////////////////
// DOCUMENT MIDDLEWARE///
/////////////////////////

/////////////////////////
// QUERY MIDDLEWARE//////
/////////////////////////

// Populate referenced fields
postSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'topic',
    select: '-_id -__v -posts -icon',
  }).populate({
    path: 'author',
    // Only getting username, gender, profile pic
    select:
      '-email -password -bookmarks -likedPosts -posts -comments -role -createdAt -updatedAt -passwordChangedAt -passwordResetToken -passwordResetTokenExpiresIn -_id -__v',
  });
  // .populate({
  //   path: 'comments',
  //   select: '-__v -_id -comments -parentComment -fromPost',
  // });

  next();
});

// Update updatedAt when document is modified
postSchema.pre('findOneAndUpdate', function (next) {
  if (this._update) {
    this._update.updatedAt = new Date();
  }

  next();
});

/////////////////////////
/// INSTANCE METHODS ////
/////////////////////////

// Remove comment
postSchema.methods.sameAuthor = util.sameAuthor;
postSchema.methods.setReference = util.setReference;

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
