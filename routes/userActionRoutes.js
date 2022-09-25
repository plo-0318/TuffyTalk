const express = require('express');
const userActionController = require('../controllers/userActionController');
const authController = require('../controllers/authController');
const Post = require('../models/postModel');
const Comment = require('../models/commentModel');

const router = express.Router();

router.use(authController.protect);

router.route('/create-post').post(userActionController.createPost);
router.route('/create-comment').post(userActionController.createComment);
router
  .route('/update-post/:id')
  .patch(
    authController.validateSameAuthor(Post),
    userActionController.updatePost
  );
router
  .route('/update-comment/:id')
  .patch(
    authController.validateSameAuthor(Comment),
    userActionController.updateComment
  );
router
  .route('/delete-post/:id')
  .delete(
    authController.validateSameAuthor(Post),
    userActionController.deletePost
  );
router
  .route('/delete-comment/:id')
  .delete(
    authController.validateSameAuthor(Comment),
    userActionController.deleteComment
  );

module.exports = router;
