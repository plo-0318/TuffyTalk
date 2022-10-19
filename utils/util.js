const mongoose = require('mongoose');
const path = require('path');
const mkdirp = require('mkdirp');
const fs = require('fs');
const fsp = require('fs/promises');
const UserImage = require('../models/userImageModel');

exports.setReference = async function (
  refName,
  method,
  refId,
  popultated = false
) {
  if (!this[refName]) {
    return;
  }

  const allowedMethods = ['add', 'remove', 'toggle'];

  if (!allowedMethods.includes(method)) {
    return;
  }

  const refObjId = mongoose.Types.ObjectId(refId);
  const refIndex = this[refName].indexOf(refObjId);

  if (method === 'add') {
    if (refIndex < 0) {
      this[refName].push(refObjId);
    }
  } else if (method === 'remove') {
    if (refIndex >= 0) {
      this[refName].splice(refIndex, 1);
    }
  } else if (method === 'toggle') {
    if (refIndex < 0) {
      this[refName].push(refObjId);
    } else {
      this[refName].splice(refIndex, 1);
    }
  }

  await this.save();
};

exports.sameAuthor = function (user) {
  if (!this.author) {
    return false;
  }

  return this.author.username === user.username;
};

exports.updateTime = async function () {
  if (!this.updatedAt) {
    return;
  }

  this.updatedAt = new Date();

  await this.save();
};

exports.moveFile = function (oldPath, newPath, callback) {
  fs.rename(oldPath, newPath, function (err) {
    if (err) {
      if (err.code === 'EXDEV') {
        copy();
      } else {
        callback(err);
      }
      return;
    }
    callback();
  });

  function copy() {
    var readStream = fs.createReadStream(oldPath);
    var writeStream = fs.createWriteStream(newPath);

    readStream.on('error', callback);
    writeStream.on('error', callback);

    readStream.on('close', function () {
      fs.unlink(oldPath, callback);
    });

    readStream.pipe(writeStream);
  }
};

exports.moveFileErrorHandler = (err) => {
  if (!err) {
    return;
  }

  if (!err.code || err.code !== 'ENOENT') {
    return next(
      new AppError(
        'An error occured during image upload. Please try again later',
        500
      )
    );
  }
};

exports.transferImageAndUpdateDoc = async (
  doc,
  userId,
  imageNames,
  dirName
) => {
  if (imageNames && imageNames.length > 0) {
    // If no directory doesn't exist, create one
    await mkdirp(`${appRoot}/public/img/users/${userId}/${dirName}/${doc._id}`);

    // Move the image files
    imageNames.forEach((imgName) => {
      const oldPath = `${appRoot}/public/img/users/${userId}/temp_upload/${imgName}`;
      const newPath = `${appRoot}/public/img/users/${userId}/${dirName}/${doc._id}/${imgName}`;

      this.moveFile(oldPath, newPath, this.moveFileErrorHandler);
    });

    doc.content = doc.content.replace(/temp_upload/g, `${dirName}/${doc._id}`);
    await doc.save();
  }
};

exports.uploadImageToDbAndUpdateDoc = async (
  doc,
  userId,
  imageNames,
  oldDocContent = ''
) => {
  if (imageNames && imageNames.length > 0) {
    for (imgName of imageNames) {
      if (!oldDocContent.includes(imgName)) {
        const path = `${appRoot}/public/img/users/${userId}/temp_upload/${imgName}`;

        const newImage = await UserImage.create({
          data: fs.readFileSync(path, (err, data) => {
            if (err) {
              return next(
                new AppError('Error reading image. Please try again later', 500)
              );
            }
          }),
          type: 'image/webp',
          name: imgName,
        });

        const domain =
          process.env.NODE_ENV === 'production'
            ? process.env.DOMAIN
            : 'http://127.0.0.1:5000';

        doc.content = doc.content.replace(
          `${domain}/img/users/${userId}/temp_upload/${imgName}`,
          newImage._id
        );
      }
    }

    await doc.save();
  }
};

exports.deleteFiles = async (dir, removeDir, ...exclude) => {
  let files;

  try {
    files = await fsp.readdir(dir);
  } catch (err) {
    if (err.code && err.code === 'ENOENT') {
      return;
    }

    throw new Error(err);
  }

  for (const file of files) {
    if (!exclude.includes(file)) {
      await fsp.unlink(path.join(dir, file));
    }
  }

  if (removeDir) {
    await fsp.rmdir(dir);
  }
};

exports.deleteImagesFromDb = async (content, shouldDelete) => {
  const re = /<img[^>]+src="([^">]+)/g;
  let img;
  const images = [];
  while ((img = re.exec(content))) {
    images.push(img[1]);
  }

  for (let i = 0; i < images.length; i++) {
    const split = images[i].split('/');
    const id = split[split.length - 1];

    if (shouldDelete(id)) {
      await UserImage.findByIdAndDelete(id);
    }
  }
};
