const mongoose = require('mongoose');
const path = require('path');
const mkdirp = require('mkdirp');
const fs = require('fs');
const fsp = require('fs/promises');

exports.setReference = async function (refName, method, refId) {
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
    this[refName].push(refObjId);
  } else if (method === 'remove') {
    this[refName].splice(refIndex, 1);
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

exports.deleteFiles = async (dir, removeDir, ...exclude) => {
  let files;

  console.log('h1');

  try {
    files = await fsp.readdir(dir);
  } catch (err) {
    if (err.code && err.code === 'ENOENT') {
      return;
    }

    throw new Error(err);
  }

  console.log('h2');

  for (const file of files) {
    if (!exclude.includes(file)) {
      await fsp.unlink(path.join(dir, file));
    }
  }

  console.log('h3');

  if (removeDir) {
    await fsp.rmdir(dir);
  }

  console.log('h4');
};
