const Validator = require('validator');

function isEmpty(value) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'object' && Object.keys(value).length === 0) ||
    (typeof value === 'string' && value.trim().length === 0)
  );
}

module.exports = function validateTaskInput(data) {
  let errors = {};

  // Ensure data is an object
  data = data || {};

  // Convert to string or empty string if undefined
  data.title = !isEmpty(data.title) ? data.title.toString().trim() : '';
  data.description = !isEmpty(data.description) ? data.description.toString().trim() : '';

  // Title validation
  if (Validator.isEmpty(data.title)) {
    errors.title = 'Task title is required';
  } else if (!Validator.isLength(data.title, { min: 3, max: 100 })) {
    errors.title = 'Task title must be between 3 and 100 characters';
  }

  // Description validation
  if (Validator.isEmpty(data.description)) {
    errors.description = 'Task description is required';
  } else if (!Validator.isLength(data.description, { min: 10, max: 500 })) {
    errors.description = 'Task description must be between 10 and 500 characters';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};