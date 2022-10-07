const express = require('express');
const majorController = require('../controllers/majorController');
const authController = require('../controllers/authController');

const router = express.Router();

router
  .route('/')
  .get(majorController.getAllMajors)
  .post(
    authController.protect,
    authController.restrictTo('admin'),
    majorController.createMajor
  );

router.use(authController.protect, authController.restrictTo('admin'));

router
  .route('/:id')
  .get(majorController.getMajor)
  .patch(majorController.updateMajor)
  .delete(majorController.deleteMajor);

module.exports = router;
