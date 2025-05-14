const isEmpty = require("./isEmpty.js");
const validator = require("validator");

module.exports = function rolesValidation(data) {
  let errors = {};

  data.name = !isEmpty(data.name) ? data.name : "";
  if (validator.isEmpty(data.name)) {
    errors.name = "required name";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};
// validation/rolesValidation.js
/*const isEmpty = require("./isEmpty.js");
const validator = require("validator");

module.exports = function rolesValidation(data) {
  let errors = {};

  // Support both title and name fields for backwards compatibility
  data.title = !isEmpty(data.title) ? data.title : data.name || "";
  data.description = !isEmpty(data.description) ? data.description : "";

  if (validator.isEmpty(data.title)) {
    errors.title = "Role title is required";
  }

  if (validator.isEmpty(data.description)) {
    errors.description = "Role description is required";
  }

  return {
    errors,
    isValid: isEmpty(errors),
  };
};*/
