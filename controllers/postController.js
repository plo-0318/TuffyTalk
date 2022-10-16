const Post = require('../models/postModel');
const handlerFactory = require('../controllers/handlerFactory');
const catchAsync = require('../utils/catchAsync');

exports.getAllPosts = handlerFactory.getAll(Post);
exports.createPost = handlerFactory.createOne(Post);
exports.getPost = handlerFactory.getOne(Post);
exports.updatePost = handlerFactory.updateOne(Post);
exports.deletePost = handlerFactory.deleteOne(Post);

exports.searchPost = catchAsync(async (req, res, next) => {
  const { term } = req.query;

  const re = new RegExp(term);

  const posts = await Post.find({
    $or: [
      {
        title: { $regex: re, $options: 'i' },
      },
      { content: { $regex: re, $options: 'i' } },
    ],
  }).sort('-createdAt _id');

  res.status(200).json({
    status: 'success',
    length: posts.length,
    data: {
      data: posts,
    },
  });
});
