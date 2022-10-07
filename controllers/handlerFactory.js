const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const QueryDocument = require('../utils/QueryDocument');

exports.getAll = (Model) => {
  return catchAsync(async (req, res, next) => {
    const queryDoc = new QueryDocument(Model.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const doc = await queryDoc.query;

    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });
};

exports.getOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findById(req.params.id);

    if (!doc) {
      return next(new AppError('Could not find a document with this ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });
};

exports.createOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });
};

exports.updateOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('Could not find a document with this ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });
};

exports.deleteOne = (Model) => {
  return catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('Could not find a document with this ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
};

exports.userUpdateOne = (Model, validateAuthor, ...fields) => {
  return catchAsync(async (req, res, next) => {
    // Check if the current user is trying to modify other user's content --> moved to a middleware
    /* if (validateAuthor) {
      const doc = await Model.findOne({ _id: req.params.id });

      if (!doc.sameAuthor(req.user)) {
        return next(new AppError("Cannot modify other user's post", 401));
      }
    } */

    // Select only the allowed fields from req.body
    const dataToUpdate = {};
    fields.forEach((field) => {
      if (req.body[field]) {
        dataToUpdate[field] = req.body[field];
      }
    });

    // Find and update document
    const doc = await Model.findByIdAndUpdate(req.params.id, dataToUpdate, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('Could not find a document with this ID', 404));
    }

    if (Object.keys(dataToUpdate).length > 1) {
      if (doc.updateTime) {
        await doc.updateTime();
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });
};
