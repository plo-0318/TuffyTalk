const UserImage = require('../models/userImageModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');

exports.getImage = catchAsync(async (req, res, next) => {
  const image = await UserImage.findById(req.params.id);

  res.status(200).json(image);
});

exports.createImage = catchAsync(async (req, res, next) => {
  const newImage = await UserImage.create({
    data: req.file.data,
    type: 'image/webp',
    name: `user-upload-${Date.now()}`,
  });

  res.status(201).json({
    message: 'success',
    data: {
      newImage,
    },
  });
});

exports.getUserImage = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  res.status(200).json(user.profilePicture.data);
});
