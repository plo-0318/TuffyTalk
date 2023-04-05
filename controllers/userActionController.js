const mongoose = require('mongoose');
const multer = require('multer');
const sharp = require('sharp');
const mkdirp = require('mkdirp');
const path = require('path');
const fs = require('fs');

const Topic = require('../models/topicModel');
const Post = require('../models/postModel');
const Comment = require('../models/commentModel');
const User = require('../models/userModel');
const Major = require('../models/majorModel');
const UserImage = require('../models/userImageModel');

const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const handlerFactory = require('../controllers/handlerFactory');
const {
  deleteFiles,
  deleteImagesFromDb,
  uploadImageToDbAndUpdateDoc,
} = require('../utils/util');
const SavedPost = require('../models/savedPost');

/////////////////////////
//////// CREATE /////////
/////////////////////////

const validateReqImages = (images, next) => {
  if (images) {
    if (images.constructor !== Array) {
      return next(new AppError('Invalid image data', 400));
    }

    if (images.length > 3) {
      return next(new AppError('Only 3 images are allowed for now', 400));
    }
  }
};

exports.createPost = catchAsync(async (req, res, next) => {
  const { topic: topicName, title, content, images: imageNames } = req.body;

  validateReqImages(imageNames, next);

  // See if the topic exists. If not, return error
  const topic = await Topic.findOne({ name: topicName });

  if (!topic) {
    return next(new AppError(`Cannot find topic: ${topicName}`, 404));
  }

  const newPost = await Post.create({
    author: req.user.id,
    topic: topic.id,
    title,
    content,
    images: imageNames || [],
  });

  // If have iamges, move the images from temp_upload to 'postId'
  // await transferImageAndUpdateDoc(newPost, req.user._id, imageNames, 'posts');
  await uploadImageToDbAndUpdateDoc(newPost, req.user._id, imageNames);

  res.status(201).json({
    status: 'success',
    data: {
      data: newPost,
    },
  });
});

exports.createComment = catchAsync(async (req, res, next) => {
  //author, content, parentComment?, fromPost, images?

  const { content, parentComment, fromPost, images: imageNames } = req.body;

  validateReqImages(imageNames, next);

  const commentToCreate = {
    author: req.user.id,
    content,
    fromPost,
    images: imageNames || [],
  };

  let pComment = null;

  if (parentComment) {
    pComment = await Comment.findById(parentComment);

    if (!pComment) {
      return next('Could not find the parent comment', 404);
    }

    commentToCreate.parentComment = parentComment;
  }

  // See if the post exists. If not, return error
  const post = await Post.findOne({ _id: fromPost });

  if (!post) {
    return next(
      new AppError(`Cannot find a post with this id: ${fromPost}`, 404)
    );
  }

  const newComment = await Comment.create(commentToCreate);

  // If have iamges, move the images from temp_upload to 'postId'
  // await transferImageAndUpdateDoc(
  //   newComment,
  //   req.user._id,
  //   imageNames,
  //   'comments'
  // );
  await uploadImageToDbAndUpdateDoc(newComment, req.user._id, imageNames);

  if (pComment) {
    await pComment.setReference('comments', 'add', newComment._id);
  }

  res.status(201).json({
    status: 'success',
    data: {
      data: newComment,
    },
  });
});

/////////////////////////
//////// UPDATE /////////
/////////////////////////

exports.updatePost = handlerFactory.userUpdateOne(
  Post,
  'post',
  'content',
  'title',
  'images'
);

exports.updateComment = handlerFactory.userUpdateOne(
  Comment,
  'comment',
  'content',
  'images'
);

/////////////////////////
//////// DELETE /////////
/////////////////////////

exports.deletePost = catchAsync(async (req, res, next) => {
  //TODO: consider setting the post inactive?

  //   const post = await Post.findOne({ _id: req.params.id }).select('_id');
  // req.doc comes from validateAuthor middleware
  const post = req.doc;

  if (!post) {
    return next(new AppError('Could not find a post with this id', 404));
  }

  // Delete the post iamges if any
  if (post.images && post.images.length > 0) {
    // const dir = path.join(
    //   global.appRoot,
    //   `/public/img/users/${req.user._id}/posts/${post._id}`
    // );

    // await deleteFiles(dir, true);

    await deleteImagesFromDb(post.content, (id) => true);
  }

  //TODO: delete the comments in the post

  // Delete the actual post
  if (topic) {
    await Post.findOneAndDelete({ _id: post._id });
  }

  res.status(204).json({
    status: 'success',
    message: null,
  });
});

exports.deleteComment = catchAsync(async (req, res, next) => {
  const comment = req.doc;

  if (!comment) {
    return next(new AppError('Could not find a comment with this id', 404));
  }

  // Delete the images if any
  if (comment.images && comment.images.length > 0) {
    // const dir = path.join(
    //   global.appRoot,
    //   `/public/img/users/${req.user._id}/comments/${comment._id}`
    // );

    // await deleteFiles(dir, true);

    await deleteImagesFromDb(comment.content, (id) => true);
  }

  // Delete the actual comment OR disable the comment
  //   await Comment.deleteOne({ _id: comment._id });
  await Comment.findByIdAndUpdate(comment._id, {
    content: '',
    deleted: true,
    images: [],
  });

  res.status(204).json({
    status: 'success',
    message: null,
  });
});

/////////////////////////
//////// TOGGLE /////////
/////////////////////////

exports.constructToggleQuery = (docType, postType) => {
  return catchAsync(async (req, res, next) => {
    const docTypeLower = docType.toLowerCase();
    const { id } = req.params;

    if (docTypeLower === 'comment') {
      const commentDoc = await Comment.findById(id);

      if (!commentDoc) {
        return next(new AppError('This comment does not exist', 404));
      }

      req.toggleQuery = {
        user: req.user.id,
        comment: id,
        commentCreatedAt: commentDoc.createdAt,
      };

      return next();
    }

    if (docTypeLower === 'post') {
      const allowedFields = ['bookmark', 'like'];

      if (!allowedFields.includes(postType.toLowerCase())) {
        return next(new AppError('Invalid post type', 401));
      }

      const postDoc = await Post.findById(id);

      if (!postDoc) {
        return next(new AppError('This post does not exist', 404));
      }

      req.toggleQuery = {
        user: req.user.id,
        type: postType.toLowerCase(),
        post: id,
        postCreatedAt: postDoc.createdAt,
      };

      return next();
    }

    return next(new AppError('Invalid document type', 401));
  });
};

exports.toggleDoc = (model) => {
  return catchAsync(async (req, res, next) => {
    const query = req.toggleQuery;

    const doc = await model.findOne(query);
    let newDoc = null;

    if (!doc) {
      newDoc = await model.create(query);
    } else {
      await model.findByIdAndDelete(doc._id);
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: newDoc,
      },
    });
  });
};

/////////////////////////
////////// GET //////////
/////////////////////////

exports.getUserPosts = () => {
  return catchAsync(async (req, res, next) => {
    const posts = await Post.find({ author: req.user.id })
      .select('-__v -content -likes -images -comments -id -author')
      .sort('-createdAt _id');

    res.status(200).json({
      status: 'success',
      length: posts.length,
      data: {
        data: posts,
      },
    });
  });
};

exports.getSavedPosts = (type) => {
  return catchAsync(async (req, res, next) => {
    const allowedTypes = ['bookmark', 'like'];

    const postType = type.toLowerCase();

    if (!allowedTypes.includes(postType)) {
      return next(new AppError('Invalid post type', 401));
    }

    const posts = await SavedPost.find({
      user: req.user.id,
      type: postType,
    })
      .select('-__v -user -_id -createdAt -type')
      .sort('-createdAt _id');

    res.status(200).json({
      status: 'success',
      data: {
        data: posts,
      },
    });
  });
};

/////////////////////////
////// UPDATE USER //////
/////////////////////////

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Please only upload images', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadImage = upload.single('image');

exports.resizeImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  // req.file.filename = `user-${req.user._id}-profile-pic.webp`;

  // await mkdirp(`${appRoot}/public/img/users/${req.user._id}`);

  // const path = `public/img/users/${req.user._id}/${req.file.filename}`;

  // await sharp(req.file.buffer)
  //   .rotate()
  //   .resize(500, 500)
  //   .toFormat('webp')
  //   .webp({ quality: 90 })
  //   .toFile(`public/img/users/${req.user._id}/${req.file.filename}`);

  const buffer = await sharp(req.file.buffer)
    .rotate()
    .resize(500, 500)
    .toFormat('webp')
    .webp({ quality: 90 })
    .toBuffer();

  req.file = {
    data: buffer,
    type: 'image/webp',
    name: `user-${req.user._id}-profile-pic.webp`,
  };

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const filteredObj = {};

  Object.keys(obj).forEach((key) => {
    if (allowedFields.includes(key)) {
      filteredObj[key] = obj[key];
    }
  });

  return filteredObj;
};

exports.updateMe = catchAsync(async (req, res, next) => {
  // const dataToUpdate = {};

  const dataToUpdate = filterObj(req.body, 'major', 'username');

  // if (req.file) {
  //   dataToUpdate.profilePicture = req.file;
  // }

  if (dataToUpdate.major) {
    dataToUpdate.major = req.body.major;

    const major = await Major.findOne({ name: dataToUpdate.major });

    if (!major) {
      return next(
        new AppError(`${dataToUpdate.major} is not a valid major`, 400)
      );
    }
  }

  if (Object.keys(dataToUpdate).length < 1 && !req.file) {
    res.status(200).json({
      status: 'success',
      changed: false,
      data: {
        data: req.user,
      },
    });
  } else {
    let profilePicture = null;

    if (req.file) {
      profilePicture = await UserImage.create(req.file);

      if (!profilePicture) {
        return next(
          new AppError(
            'Error storing profile picture. Please try again later',
            500
          )
        );
      }

      dataToUpdate.profilePicture = profilePicture._id;

      if (
        req.user.profilePicture._id.toString() !==
        process.env.USER_PROFILE_PICTURE_PLACEHOLDER_ID
      ) {
        await UserImage.findByIdAndDelete(req.user.profilePicture._id);
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      dataToUpdate,
      {
        new: true,
        runValidators: true,
      }
    );

    req.user = updatedUser;

    res.status(200).json({
      status: 'success',
      changed: true,
      data: {
        data: updatedUser,
      },
    });
  }
});

/////////////////////////
////// UPLOAD IMAGE /////
/////////////////////////

exports.processImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Could not find the uploaded image', 400));
  }

  let fileName = req.file.originalname.split('.');
  fileName.pop();
  fileName = fileName.join('.');

  // const now = new Date();
  // const timeString = `${now.toLocaleDateString().replace(/\//g, '-')}--${now
  //   .toLocaleTimeString()
  //   .replace(/:/g, '-')
  //   .replace(' ', '')}`;

  fileName = `${req.user._id}-${fileName}-${Date.now()}.webp`;

  await mkdirp(`${appRoot}/public/img/users/${req.user._id}/temp_upload`);

  await sharp(req.file.buffer)
    .rotate()
    .resize({
      fit: 'contain',
      width: 500,
    })
    .toFormat('webp')
    .webp({ quality: 90 })
    .toFile(`public/img/users/${req.user._id}/temp_upload/${fileName}`);

  res.status(200).json({
    message: 'success',
    path: `img/users/${req.user._id}/temp_upload/${fileName}`,
  });
});

exports.deleteTempUpload = catchAsync(async (req, res, next) => {
  const dir = path.join(
    global.appRoot,
    `/public/img/users/${req.user._id}/temp_upload`
  );

  await deleteFiles(dir, false);

  res.status(204).json({
    message: 'success',
    data: null,
  });
});
