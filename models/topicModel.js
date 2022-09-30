const mongoose = require('mongoose');

const topicSchema = mongoose.Schema({
  name: {
    type: String,
    trim: true,
    unique: true,
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
  category: {
    type: String,
    required: [true, 'A topic must belong to a category'],
    enum: {
      values: ['general', 'stem', 'others'],
      message: "A topic category is either 'general', 'stem', or 'others'",
    },
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
      '-topic -__v -images -likes -content -createdAt -updatedAt -modified',
  });

  next();
});

const Topic = mongoose.model('Topic', topicSchema);

module.exports = Topic;
