const mongoose = require('mongoose');

exports.setReference = async function (refName, method, refId) {
  if (!this[refName]) {
    return;
  }

  if (method !== 'add' && method !== 'remove') {
    return;
  }

  const refObjId = mongoose.Types.ObjectId(refId);
  const refIndex = this[refName].indexOf(refObjId);

  if (method === 'add') {
    this[refName].push(refObjId);
  } else if (method === 'remove') {
    this[refName].splice(refIndex, 1);
  }

  await this.save();
};

exports.sameAuthor = function (user) {
  if (!this.author) {
    return false;
  }

  return this.author.username === user.username;
};
