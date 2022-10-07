const Topic = require('../models/topicModel');
const Post = require('../models/postModel');
const Comment = require('../models/commentModel');
const User = require('../models/userModel');
const Major = require('../models/majorModel');

const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const handlerFactory = require('../controllers/handlerFactory');

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

exports.updatePost = handlerFactory.userUpdateOne(
  Post,
  true,
  'content',
  'title'
);

exports.updateComment = handlerFactory.userUpdateOne(Comment, true, 'content');

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

exports.toggleLikePost = catchAsync(async (req, res, next) => {
  const { postId } = req.params;

  const post = await Post.findById(postId);

  if (!post) {
    return next(new AppError('No post found with this id', 404));
  }

  await post.setReference('likes', 'toggle', req.user._id);

  res.status(200).json({
    status: 'sucess',
    data: {
      data: post,
    },
  });
});

exports.toggleLikeComment = catchAsync(async (req, res, next) => {});

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
