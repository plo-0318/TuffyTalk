const Major = require('../models/majorModel');
const handlerFactory = require('../controllers/handlerFactory');

exports.getAllMajors = handlerFactory.getAll(Major);
exports.createMajor = handlerFactory.createOne(Major);
exports.getMajor = handlerFactory.getOne(Major);
exports.updateMajor = handlerFactory.updateOne(Major);
exports.deleteMajor = handlerFactory.deleteOne(Major);
