const { Query } = require('mongoose');

class QueryDocument {
  constructor(query, queryString) {
    // query -> model.find(), is a query object from mongoose
    // query -> req.query, is an object

    this.number = 5;
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'field'];

    excludedFields.forEach((field) => delete queryObj[field]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    let queryJSON = JSON.parse(queryStr);

    Object.keys(queryJSON).map((key) => {
      if (queryJSON[key] === '') {
        queryJSON[key] = null;
      }
    });

    this.query = this.query.find(queryJSON);

    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');

      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt -_id');
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.split(',').join(' ');

      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    // queryString: page=2&limit=10 --> 11-20

    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = QueryDocument;
