const mongoose = require('mongoose');
const util = require('../utils/util');

const commentSchema = mongoose.Schema({
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'A comment must belong to an author.'],
  },
  content: {
    type: String,
    required: [true, 'A post must have a content.'],
    maxLength: [200, 'A post content cannot exceeds 200 characters.'],
    minLength: [3, 'A post content needs to be at least 3 characters.'],
  },
  images: {
    type: [String],
    validate: {
      validator: function (val) {
        val.length <= 5;
      },
      message: 'A comment can only contain 5 images.',
    },
  },
  likes: {
    type: Number,
    default: 0,
  },
  comments: [
    { type: mongoose.Schema.ObjectId, ref: 'Comment', required: false },
  ],
  parentComment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Comment',
    default: null,
  },
  fromPost: {
    type: mongoose.Schema.ObjectId,
    ref: 'Post',
    required: [true, 'A comment must belong to a post.'],
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
  updatedAt: Date,
  deleted: {
    type: Boolean,
    default: false,
  },
});

/////////////////////////
// DOCUMENT MIDDLEWARE///
/////////////////////////

// Upon creating a nested comment, add the this as a reference to the parent comment
commentSchema.pre(/^save/, async function (next) {
  if (this.parentComment) {
    const parentDoc = await this.constructor.findOne({
      _id: this.parentComment,
    });

    if (parentDoc) {
      parentDoc.comments.push(this._id);

      await parentDoc.save();
    } else {
      this.parentComment = null;
    }
  }

  next();
});

/////////////////////////
// QUERY MIDDLEWARE//////
/////////////////////////

// Populate referenced fields
commentSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'author',
    select:
      '-email -password -bookmarks -likedPosts -comments -role -createdAt -updatedAt -passwordChangedAt -passwordResetToken -passwordResetTokenExpiresIn -_id -__v',
  }).populate({
    path: 'fromPost',
    select:
      '-topic -content -__v -images -likes -comments -createdAt -updatedAt -modified',
  });
  /* .populate({
      path: 'comments',
      select: '-__v -_id -comments -parentComment -fromPost',
    }); */

  /* console.log('I am working');
  const docToUpdate = await this.model.findOne(this.getQuery());
  console.log(docToUpdate); */

  next();
});

// Update updatedAt when document is modified
commentSchema.pre('findOneAndUpdate', async function (next) {
  this._update.updatedAt = new Date();

  next();
});

// Before deleting the comment, if this is a nested comment, remove this from the parent reference
// Saving the current comment in the query object
/* commentSchema.pre('findOneAndDelete', async function (next) {
  const currentComment = await this.model.findOne(this.getQuery());

  if (!currentComment.parentComment) {
    return next();
  }

  const parentComment = await this.model.findOne({
    _id: currentComment.parentComment,
  });

  if (!parentComment) {
    return next();
  }

  this.cId = currentComment.id;
  this.parentComment = parentComment;

  next();
});

// Actually removing the this comment from the parent reference
commentSchema.post('findOneAndDelete', async function () {
  const childIndex = this.parentComment.comments.indexOf(this.cId);

  this.parentComment.comments.splice(childIndex, 1);

  await this.parentComment.save();
}); */

/////////////////////////
/// INSTANCE METHODS ////
/////////////////////////

// Remove comment
commentSchema.methods.sameAuthor = util.sameAuthor;
commentSchema.methods.setReference = util.setReference;

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
