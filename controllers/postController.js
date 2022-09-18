const Post = require('../models/postModel');
const handlerFactory = require('../controllers/handlerFactory');

exports.getAllPosts = handlerFactory.getAll(Post);
exports.createPost = handlerFactory.createOne(Post);
exports.getPost = handlerFactory.getOne(Post);
exports.updatePost = handlerFactory.updateOne(Post);
exports.deletePost = handlerFactory.deleteOne(Post);
