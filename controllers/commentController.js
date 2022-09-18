const handlerFactory = require('../controllers/handlerFactory');
const Comment = require('../models/commentModel');

exports.getAllComments = handlerFactory.getAll(Comment);
exports.createComment = handlerFactory.createOne(Comment);
exports.getComment = handlerFactory.getOne(Comment);
exports.updateComment = handlerFactory.updateOne(Comment);
exports.deleteComment = handlerFactory.deleteOne(Comment);
