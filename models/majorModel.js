const mongoose = require('mongoose');

const majorSchema = mongoose.Schema({
  name: String,
});

const major = mongoose.model('Major', majorSchema);

module.exports = major;
