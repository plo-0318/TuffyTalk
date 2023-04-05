const mongoose = require('mongoose');
const util = require('../utils/util');
const LikedComment = require('./likedComment');

const commentSchema = mongoose.Schema({
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'A comment must belong to an author.'],
  },
  content: {
    type: String,
    required: [true, 'A comment must have a content.'],
    maxLength: [500, 'A comment cannot exceeds 500 characters.'],
    minLength: [3, 'A comment needs to be at least 3 characters.'],
  },
  images: {
    type: [String],
    validate: {
      validator: function (val) {
        val.length <= 3;
      },
      message: 'A comment can only contain 3 images.',
    },
  },
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
  numLikes: {
    type: Number,
    default: 0,
  },
  comments: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Comment',
    },
  ],
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
/* commentSchema.pre(/^save/, async function (next) {
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
}); */

/////////////////////////
// QUERY MIDDLEWARE//////
/////////////////////////

// Populate referenced fields
commentSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'author',
    select:
      '-email -password -bookmarks -likedPosts -comments -role -createdAt -updatedAt -passwordChangedAt -passwordResetToken -passwordResetTokenExpiresIn -__v -posts',
  });
  /* .populate({
    path: 'fromPost',
    select:
      '-topic -content -__v -images -likes -comments -createdAt -updatedAt -modified',
  }); */
  /* .populate({
      path: 'comments',
      select: '-__v -_id -comments -parentComment -fromPost',
    }); */

  /* console.log('I am working');
  const docToUpdate = await this.model.findOne(this.getQuery());
  console.log(docToUpdate); */

  next();
});

commentSchema.post(/^find/, async function (doc, next) {
  if (!doc) {
    return next();
  }

  const likedComments = await LikedComment.find({ comment: doc.id });

  doc.numLikes = likedComments.length;

  next();
});

commentSchema.pre('deleteMany', async function (next) {
  const commentsToDelete = await this.model.find(this._conditions);

  for (const comment of commentsToDelete) {
    if (comment.images.length > 0) {
      // const dir = path.join(
      //   global.appRoot,
      //   `/public/img/users/${currentComment.author._id}/comments/${currentComment._id}`
      // );

      // await util.deleteFiles(dir, true);

      await util.deleteImagesFromDb(comment.content, (id) => true);
    }
  }

  next();
});

// Update updatedAt when document is modified
// commentSchema.pre('findOneAndUpdate', async function (next) {
//   this._update.updatedAt = new Date();

//   next();
// });

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
commentSchema.methods.updateTime = util.updateTime;

commentSchema.index({ fromPost: 1 });
commentSchema.index({ parentComment: 1 });

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;
