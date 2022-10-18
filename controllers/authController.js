const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/userModel');
const Major = require('../models/majorModel');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const Email = require('../utils/Email');

/////////////////////////
////////// JWT //////////
/////////////////////////
const signToken = (id) => {
  const token = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  return token;
};

createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  const expires = new Date(
    Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
  );

  const cookieOptions = {
    expires,
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
  };

  // For heroku
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    cookieOptions.secure = true;
    cookieOptions.sameSite = 'lax';
  }

  // For safari
  // if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
  //   cookieOptions.secure = true;
  //   cookieOptions.domain = 'tuffytalk.herokuapp.com';
  //   cookieOptions.sameSite = 'none';
  // }

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    tokenExpiresIn: expires,
    data: {
      user,
    },
  });
};

/////////////////////////
///// Login / Singup ////
/////////////////////////
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exists
  if (!email || !password) {
    return next(new AppError('Please provide email and password.', 404));
  }

  // 2) Check if user exists and password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password.', 401));
  }

  // 3) If all good, send token
  createSendToken(user, 200, req, res);
});

exports.signup = catchAsync(async (req, res, next) => {
  const { username, email, password } = req.body;

  const user = await User.create({ username, email, password });

  createSendToken(user, 201, req, res);
});

exports.logout = (req, res) => {
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
  };

  //For heroku
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    cookieOptions.secure = true;
    cookieOptions.sameSite = 'none';
  }

  // // For safari
  // if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
  //   cookieOptions.secure = true;
  //   cookieOptions.domain = 'tuffytalk.herokuapp.com';
  //   cookieOptions.sameSite = 'none';
  // }

  res.cookie('jwt', 'loggedout', cookieOptions);

  res.status(200).json({
    status: 'success',
  });
};

exports.isLoggedIn = async (req, res, next) => {
  const sendNoUser = () => {
    res.status(200).json({
      status: 'sucess',
      user: null,
    });
  };

  try {
    if (req.cookies.jwt) {
      // 1) Validate token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exist (ex: user deleted)
      const currentUser = await User.findById(decoded.id);

      if (!currentUser) {
        sendNoUser();
      }

      // 3) Check if user updated password after token was issued
      if (currentUser.changedPasswordAfterJWT(decoded.iat)) {
        sendNoUser();
      }

      res.status(200).json({
        status: 'success',
        user: currentUser,
      });
    } else {
      sendNoUser();
    }
  } catch (err) {
    sendNoUser();
  }
};

/////////////////////////
//////// Protect ////////
/////////////////////////

// Grant route access only to signed in users
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it exists
  let token = null;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token || token === 'null') {
    return next(new AppError('You are not logged in. Login to cotinue.', 401));
  }

  // 2) Validate token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3) Check if user still exist (ex: user deleted)
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(new AppError('No user found with this token.', 401));
  }

  // 4) Check if user updated password after token was issued
  if (currentUser.changedPasswordAfterJWT(decoded.iat)) {
    return next(
      new AppError(
        'User recently changed password. Please login again to continue.',
        401
      )
    );
  }

  // 5) If all good, grant access, and put the current user on the req object.
  req.user = currentUser;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403)
      );
    }

    next();
  };
};

/////////////////////////
/////// Password ////////
/////////////////////////
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  let user = null;
  if (req.user && req.user.id) {
    user = await User.findById(req.user.id).select('+password');
  }

  // 2) Check if POSTed password is correct
  if (
    !user ||
    !(await user.correctPassword(req.body.currentPassword, user.password))
  ) {
    return next(new AppError('Your current password is incorrect', 401));
  }

  // 3) if so, update the password
  user.password = req.body.newPassword;
  await user.save();

  // 4) Log user in, send jwt
  createSendToken(user, 200, req, res);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user from POSTed email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('There is no user with that email.', 404));
  }

  // 2) Generate a random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/reset-password/${resetToken}`;

  try {
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Reset token sent to email 👍',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiresIn = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again Later.',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpiresIn: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  // 2) If token has not expire, and there is user, set the new password
  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpiresIn = undefined;

  await user.save();

  // 3) Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

exports.validateSameAuthor = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findOne({ _id: req.params.id });

    if (!doc) {
      return next(new AppError('Cannot find a document with is id', 404));
    }

    if (!doc.sameAuthor(req.user)) {
      return next(new AppError("Cannot modify other user's document", 401));
    }

    req.doc = doc;
    next();
  });
};
