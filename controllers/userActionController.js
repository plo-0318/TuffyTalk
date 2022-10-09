const multer = require('multer');
const sharp = require('sharp');
const mkdirp = require('mkdirp');

const Topic = require('../models/topicModel');
const Post = require('../models/postModel');
const Comment = require('../models/commentModel');
const User = require('../models/userModel');
const Major = require('../models/majorModel');

const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const handlerFactory = require('../controllers/handlerFactory');

/////////////////////////
//////// CREATE /////////
/////////////////////////

exports.createPost = catchAsync(async (req, res, next) => {
  const { topic: topicName, title, content } = req.body;

  const topic = await Topic.findOne({ name: topicName });

  if (!topic) {
    return next(new AppError(`Cannot find topic: ${topicName}`, 404));
  }

  const newPost = await Post.create({
    author: req.user.id,
    topic: topic.id,
    title,
    content,
  });

  // Add reference to user
  await req.user.setReference('posts', 'add', newPost._id);

  // Add reference to topic
  await topic.setReference('posts', 'add', newPost._id);

  res.status(201).json({
    status: 'success',
    data: newPost,
  });
});

exports.createComment = catchAsync(async (req, res, next) => {
  //author, content, parentComment, fromPost

  const { content, parentComment, fromPost } = req.body;

  const commentToCreate = {
    author: req.user.id,
    content,
    fromPost,
  };

  if (parentComment) {
    commentToCreate.parentComment = parentComment;
  }

  const post = await Post.findOne({ _id: fromPost });

  if (!post) {
    return next(
      new AppError(`Cannot find a post with this id: ${fromPost}`, 404)
    );
  }

  const newComment = await Comment.create(commentToCreate);

  console.log(newComment);

  // Add reference to post
  post.comments.push(newComment.id);
  await post.save();

  // Add reference to parent comment if any
  if (parentComment) {
    const parentCom = await Comment.findOne({ _id: parentComment });
    parentCom.comments.push(newComment.id);
    await parentCom.save();
  }

  // Add reference to user
  req.user.comments.push(newComment.id);
  await req.user.save();

  res.status(201).json({
    status: 'success',
    data: newComment,
  });
});

/////////////////////////
//////// UPDATE /////////
/////////////////////////

exports.updatePost = handlerFactory.userUpdateOne(
  Post,
  true,
  'content',
  'title'
);

exports.updateComment = handlerFactory.userUpdateOne(Comment, true, 'content');

/////////////////////////
//////// DELETE /////////
/////////////////////////

exports.deletePost = catchAsync(async (req, res, next) => {
  //   const post = await Post.findOne({ _id: req.params.id }).select('_id');
  // req.doc comes from validateAuthor middleware
  const post = req.doc;

  if (!post) {
    return next(new AppError('Could not find a post with this id', 404));
  }

  const topic = await Topic.findById(req.doc.topic._id);

  // Delete reference from user
  await req.user.setReference('posts', 'remove', post._id);

  // Delete reference from topic
  await topic.setReference('posts', 'remove', post._id);

  // TODO: delete the reference from user bookmarks?

  // Delete the actual post
  if (topic) {
    await Post.findOneAndDelete({ _id: post._id });
  }

  res.status(204).json({
    status: 'success',
    message: null,
  });
});

exports.deleteComment = catchAsync(async (req, res, next) => {
  const comment = req.doc;

  if (!comment) {
    return next(new AppError('Could not find a comment with this id', 404));
  }

  /*  // Delete reference from post
  if (comment.fromPost) {
    const post = await Post.findOne({ _id: comment.fromPost._id });
    await post.setReference('comments', 'remove', comment._id);
  }

  // Delete reference from user
  await req.user.setReference('comments', 'remove', comment._id);

  // Delete reference from parent comment
  if (comment.parentComment) {
    const parentComment = await Comment.find({ _id: comment.parentComment });
    await parentComment.setReference('comments', 'remove', comment._id);
  } */

  // Delete the actual comment OR disable the comment
  //   await Comment.deleteOne({ _id: comment._id });
  comment.deleted = true;
  await comment.save();

  res.status(204).json({
    status: 'success',
    message: null,
  });
});

/////////////////////////
//////// TOGGLE /////////
/////////////////////////

exports.toggleLike = (model) => {
  return catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const doc = await model.findById(id);

    if (!doc) {
      return next(new AppError('No document found with this id', 404));
    }

    await doc.setReference('likes', 'toggle', req.user._id);

    res.status(200).json({
      status: 'sucess',
      data: {
        data: doc,
      },
    });
  });
};

exports.toggleBookmark = catchAsync(async (req, res, next) => {
  const { postId } = req.body;

  const user = await User.findById(req.user.id);

  await user.setReference('bookmarks', 'toggle', postId);

  req.user = user;

  res.status(200).json({
    status: 'success',
    data: {
      data: user,
    },
  });
});

/////////////////////////
////////// GET //////////
/////////////////////////

exports.getMyPosts = (type) => {
  return catchAsync(async (req, res, next) => {
    const ids = type === 'bookmark' ? req.user.bookmarks : req.user.posts;

    const posts = await Post.find({ _id: { $in: ids } }).select(
      '-__v -content -likes -images -comments -id'
    );

    res.status(200).json({
      status: 'success',
      length: posts.length,
      data: {
        data: posts,
      },
    });
  });
};

/////////////////////////
////// UPDATE USER //////
/////////////////////////

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Please only upload images', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  req.file.filename = `user-${req.user._id}-profile-pic.webp`;

  await mkdirp(`${appRoot}/public/img/users/${req.user._id}`);

  await sharp(req.file.buffer)
    .rotate()
    .resize(500, 500)
    .toFormat('webp')
    .webp({ quality: 90 })
    .toFile(`public/img/users/${req.user._id}/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const filteredObj = {};

  Object.keys(obj).forEach((key) => {
    if (allowedFields.includes(key)) {
      filteredObj[key] = obj[key];
    }
  });

  return filteredObj;
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // const dataToUpdate = {};

  const dataToUpdate = filterObj(req.body, 'major', 'username');

  if (req.file) {
    dataToUpdate.profilePicture = req.file.filename;
  }

  if (dataToUpdate.major) {
    dataToUpdate.major = req.body.major;

    const major = await Major.findOne({ name: dataToUpdate.major });

    if (!major) {
      return next(
        new AppError(`${dataToUpdate.major} is not a valid major`, 400)
      );
    }
  }

  if (Object.keys(dataToUpdate).length < 1) {
    res.status(200).json({
      status: 'success',
      changed: false,
      data: {
        data: req.user,
      },
    });
  } else {
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      dataToUpdate,
      {
        new: true,
        runValidators: true,
      }
    );

    req.user = updatedUser;

    res.status(200).json({
      status: 'success',
      changed: true,
      data: {
        data: updatedUser,
      },
    });
  }
});
