const mongoose = require('mongoose');

const userImageSchema = mongoose.Schema({
  data: { type: Buffer },
  type: { type: String },
  name: { type: String },
});

const UserImage = mongoose.model('UserImage', userImageSchema);

module.exports = UserImage;
