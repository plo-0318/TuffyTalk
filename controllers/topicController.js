const Topic = require('../models/topicModel');
const handlerFactory = require('../controllers/handlerFactory');

exports.getAllTopics = handlerFactory.getAll(Topic);
exports.createTopic = handlerFactory.createOne(Topic);
exports.getTopic = handlerFactory.getOne(Topic);
exports.updateTopic = handlerFactory.updateOne(Topic);
exports.deleteTopic = handlerFactory.deleteOne(Topic);
