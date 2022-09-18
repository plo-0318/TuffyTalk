const fs = require('fs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const Topic = require('../../models/topicModel');
const Post = require('../../models/postModel');
const User = require('../../models/userModel');
const Comment = require('../../models/commentModel');

dotenv.config({ path: './config.env' });

const DB = process.env.DB_URL.replace('<password>', process.env.DB_PASSWORD);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB connection successful'))
  .catch((err) => {
    console.log(err.message);
    console.log('Error connecting to database. Exiting...');
    process.exit(1);
  });

const topics = JSON.parse(fs.readFileSync(`${__dirname}/topics.json`, 'utf-8'));
const posts = JSON.parse(fs.readFileSync(`${__dirname}/posts.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const comments = JSON.parse(
  fs.readFileSync(`${__dirname}/comments.json`, 'utf-8')
);

const importData = async () => {
  try {
    await Topic.create(topics);
    await Post.create(posts);
    await User.create(users);
    await Comment.create(comments);

    console.log('Data imported successfully...');
  } catch (err) {
    console.log(err.message);
    console.log('Error importing data. Exiting...');
    process.exit(2);
  }
};

const deleteData = async () => {
  try {
    await Topic.deleteMany();
    await Post.deleteMany();
    await User.deleteMany();
    await Comment.deleteMany();

    console.log('Data deleted successfully...');
  } catch (err) {
    console.log(err.message);
    console.log('Error deleting data. Exiting...');
    process.exit(2);
  }
};

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}

//run command: node ./dev-data/data/import-dev-data.js --import
//run command: node ./dev-data/data/import-dev-data.js --delete
