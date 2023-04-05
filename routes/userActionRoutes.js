const express = require('express');

const userActionController = require('../controllers/userActionController');
const authController = require('../controllers/authController');
const Post = require('../models/postModel');
const Comment = require('../models/commentModel');
const SavedPost = require('../models/savedPost');
const LikedComment = require('../models/likedComment');

const router = express.Router();

router.use(authController.protect);

////////////////////////////////////////
// CREATE, UPDATE, DELETE posts/comments
////////////////////////////////////////
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

////////////////////////////////////////
// UPDATE user info
////////////////////////////////////////
router
  .route('/update-me')
  .patch(
    userActionController.uploadImage,
    userActionController.resizeImage,
    userActionController.updateMe
  );
router.route('/update-my-password').patch(authController.updatePassword);

////////////////////////////////////////
// GET saved posts/comments
////////////////////////////////////////
router
  .route('/my-bookmarks')
  .get(userActionController.getSavedPosts('bookmark'));
router.route('/my-liked-posts').get(userActionController.getSavedPosts('like'));
router.route('/my-posts').get(userActionController.getUserPosts());

////////////////////////////////////////
// TOGGLE posts/comments
////////////////////////////////////////
router
  .route('/toggle-bookmark/:id')
  .post(
    userActionController.constructToggleQuery('post', 'bookmark'),
    userActionController.toggleDoc(SavedPost)
  );
router
  .route('/toggle-like-post/:id')
  .post(
    userActionController.constructToggleQuery('post', 'like'),
    userActionController.toggleDoc(SavedPost)
  );
router
  .route('/toggle-like-comment/:id')
  .post(
    userActionController.constructToggleQuery('comment'),
    userActionController.toggleDoc(LikedComment)
  );

////////////////////////////////////////
// HELPERS
////////////////////////////////////////
router
  .route('/post-image')
  .post(userActionController.uploadImage, userActionController.processImage);
router
  .route('/delete-temp-upload')
  .delete(userActionController.deleteTempUpload);

module.exports = router;
