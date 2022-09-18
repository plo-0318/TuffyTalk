const User = require('../models/userModel');
const handlerFactory = require('../controllers/handlerFactory');

exports.getAllUsers = handlerFactory.getAll(User);
exports.createUser = handlerFactory.createOne(User);
exports.getUser = handlerFactory.getOne(User);
exports.updateUser = handlerFactory.updateOne(User);
exports.deleteUser = handlerFactory.deleteOne(User);
