const mongoose = require('mongoose');
const util = require('../utils/util');

const postSchema = mongoose.Schema(
  {
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
      maxLength: [1000, 'A post content cannot exceeds 1000 characters.'],
      minLength: [3, 'A post content needs to be at least 3 characters.'],
    },
    images: {
      type: [String],
      validate: {
        validator: function (val) {
          val.length <= 3;
        },
        message: 'A post can only contain 3 images.',
      },
    },
    author: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A post must have an author'],
    },
    likes: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
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
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/////////////////////////
// VIRTUAL PROPERTIES ///
/////////////////////////

postSchema.virtual('numLikes').get(function () {
  if (this.likes) {
    return this.likes.length;
  }

  return 0;
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
    select: '-__v -posts',
  }).populate({
    path: 'author',
    // Only getting username, gender, profile pic
    select:
      '-email -password -bookmarks -likedPosts -posts -comments -role -createdAt -updatedAt -passwordChangedAt -passwordResetToken -passwordResetTokenExpiresIn -__v',
  });
  // .populate({
  //   path: 'comments',
  //   select: '-__v -_id -comments -parentComment -fromPost',
  // });

  next();
});

// Update updatedAt when document is modified --> moved to userUpdaeOne (only update time if its an user action)
// postSchema.pre('findOneAndUpdate', function (next) {
//   if (this._update) {
//     this._update.updatedAt = new Date();
//   }

//   next();
// });

/////////////////////////
/// INSTANCE METHODS ////
/////////////////////////

// Remove comment
postSchema.methods.sameAuthor = util.sameAuthor;
postSchema.methods.setReference = util.setReference;
postSchema.methods.updateTime = util.updateTime;

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
