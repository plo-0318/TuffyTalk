const mongoose = require('mongoose');

const topicSchema = mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: [true, 'A topic must have a name'],
    minLength: [1, 'The name of a topic must be at least 1 character'],
    maxLength: [20, 'The name of a topic cannot exceed 20 characters'],
  },
  posts: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'Post',
      required: false,
    },
  ],
  icon: {
    type: String,
    default: 'icon-topic-default.jpg',
  },
});

/////////////////////////
// QUERY MIDDLEWARE//////
/////////////////////////

// Popultate referenced fields
topicSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'posts',
    select:
      '-topic -content -__v -images -likes -comments -createdAt -updatedAt -modified',
  });

  next();
});

const Topic = mongoose.model('Topic', topicSchema);

module.exports = Topic;
