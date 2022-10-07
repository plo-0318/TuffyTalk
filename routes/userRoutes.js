const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const router = express.Router();

// Auth
router.route('/login').post(authController.login);
router.route('/signup').post(authController.signup);
router.route('/logout').get(authController.logout);
router.route('/forgot-password').post(authController.forgotPassword);
router.route('/reset-password/:token').patch(authController.resetPassword);
router.route('/is-logged-in').get(authController.isLoggedIn);

// Protect below routes
router.use(authController.protect);

router.route('/update-my-password').patch(authController.updatePassword);

// Admin routes
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
