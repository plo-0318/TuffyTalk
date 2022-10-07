const mongoose = require('mongoose');

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
