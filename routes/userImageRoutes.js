const express = require('express');
const userImageController = require('../controllers/userImageController');
const authController = require('../controllers/authController');
const userActionController = require('../controllers/userActionController');

const router = express.Router();

router.route('/:id').get(userImageController.getImage);
router.route('/user/:id').get(userImageController.getUserImage);

router
  .route('/')
  .post(
    authController.protect,
    userActionController.uploadImage,
    userActionController.resizeImage,
    userImageController.createImage
  );

module.exports = router;
