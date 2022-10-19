const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const QueryDocument = require('../utils/QueryDocument');

const {
  uploadImageToDbAndUpdateDoc,
  deleteImagesFromDb,
} = require('../utils/util');

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

exports.userUpdateOne = (Model, type, ...fields) => {
  return catchAsync(async (req, res, next) => {
    // Select only the allowed fields from req.body
    const dataToUpdate = {};

    fields.forEach((field) => {
      if (req.body[field]) {
        dataToUpdate[field] = req.body[field];
      }
    });

    const doc = await Model.findById(req.params.id);

    if (!doc) {
      return next(new AppError('Could not find a document with this ID', 404));
    }

    // if (Object.keys(dataToUpdate).length < 1) {
    //   res.status(200).json({
    //     status: 'success',
    //     data: {
    //       data: doc,
    //     },
    //   });
    // }

    const newDoc = await Model.findByIdAndUpdate(req.params.id, dataToUpdate, {
      new: true,
      runValidators: true,
    });

    if (dataToUpdate.images.length > 0) {
      await uploadImageToDbAndUpdateDoc(
        newDoc,
        req.user._id,
        dataToUpdate.images,
        doc.content
      );
    }

    if (newDoc.updateTime) {
      await newDoc.updateTime();
    }

    const shouldDelete =
      dataToUpdate.images?.length > 0
        ? (id) => !dataToUpdate.images.includes(id)
        : () => true;

    await deleteImagesFromDb(doc.content, shouldDelete);

    res.status(200).json({
      status: 'success',
      data: {
        data: newDoc,
      },
    });
  });
};
