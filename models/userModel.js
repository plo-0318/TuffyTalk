const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const { setReference } = require('../utils/util');

function validatePassword(val) {
  const containsChar = /[a-zA-Z]/.test(val);
  const containsNum = /\d/.test(val);

  return containsChar && containsNum;
}

function validateEmail(val) {
  const re =
    /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;

  return val.toLowerCase().match(re);
}

// const profilePictureSchema = mongoose.Schema({
//   data: { type: Buffer, default: null },
//   type: { type: String, default: 'image/png' },
//   name: { type: String, default: 'user-placeholder.png' },
// });

const userSchema = mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: [true, 'A user must have an username.'],
    maxLength: [20, 'A username cannot exceeds 20 characters'],
    minLength: [3, 'A username should contain at least 3 characters'],
    trim: true,
  },
  major: {
    type: String,
    trim: true,
    default: 'Undecided',
  },
  email: {
    type: String,
    unique: true,
    validate: {
      validator: validateEmail,
      message: 'Incorrect email format.',
    },
  },
  password: {
    type: String,
    maxLength: [128, 'A password cannot exceeds 128 characters'],
    minLength: [8, 'A password should be at least 8 characters.'],
    validate: {
      validator: validatePassword,
      message:
        'Password needs to contain at least 1 character and at least 1 number',
    },
  },
  // profilePicture: {
  //   data: { type: Buffer, default: null },
  //   type: { type: String, default: 'image/png' },
  //   name: { type: String, default: 'user-placeholder.png' },
  // },
  profilePicture: {
    type: mongoose.Schema.ObjectId,
    ref: 'UserImage',
    default: '634f8b0cc19a15d06837db4b',
  },
  gender: {
    type: String,
    default: 'noPref',
    enum: {
      values: ['male', 'female', 'noPref'],
      messages: "A user's gender is either male, female, or noPref",
    },
  },
  role: {
    type: String,
    default: 'user',
    enum: {
      values: ['user', 'admin'],
      message: "A user's role is either user or admin",
    },
  },
  createdAt: {
    type: Date,
    default: new Date(),
  },
  updatedAt: Date,
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetTokenExpiresIn: Date,
});

/////////////////////////
// DOCUMENT MIDDLEWARE///
/////////////////////////

// Encrypt password before saving to database, update passwordChangedAt
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  if (!this.isNew) {
    this.passwordChangedAt = Date.now() - 1000;
  }

  this.password = await bcrypt.hash(this.password, 12);

  next();
});

/////////////////////////
// QUERY MIDDLEWARE//////
/////////////////////////

// Popultate referenced fields
userSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'profilePicture',
  });

  next();
});

// Update updatedAt when document is modified
userSchema.pre('findOneAndUpdate', function (next) {
  this._update.updatedAt = new Date();

  next();
});

/////////////////////////
/// INSTANCE METHODS ////
/////////////////////////

// Compare encrypted password with input password
userSchema.methods.correctPassword = async function (
  inputPassword,
  userPassword
) {
  return await bcrypt.compare(inputPassword, userPassword);
};

// Check if password has been changed after jwt was issued
userSchema.methods.changedPasswordAfterJWT = function (jwtTimestamp) {
  // FALSE means password is not changed after jwt was issued
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return jwtTimestamp < changedTimestamp;
  }

  return false;
};

// Generate a password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetTokenExpiresIn = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// Add or remove reference
userSchema.methods.setReference = setReference;

const User = mongoose.model('User', userSchema);

module.exports = User;
