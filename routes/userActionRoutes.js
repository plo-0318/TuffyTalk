const express = require('express');
const multer = require('multer');
const sharp = require('sharp');

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

router
  .route('/update-me')
  .patch(
    userActionController.uploadUserPhoto,
    userActionController.resizeUserPhoto,
    userActionController.updateMe
  );
router.route('/update-my-password').patch(authController.updatePassword);
router.route('/toggle-bookmark').patch(userActionController.toggleBookmark);
router
  .route('/get-my-bookmarked-posts')
  .get(userActionController.getMyPosts('bookmark'));
router.route('/get-my-posts').get(userActionController.getMyPosts('post'));

router
  .route('/toggle-like-post/:id')
  .patch(userActionController.toggleLike(Post));
router
  .route('/toggle-like-comment/:id')
  .patch(userActionController.toggleLike(Comment));

module.exports = router;
