const isEmpty = require("./isEmpty");
const validator = require("validator");

module.exports = function profileValidation(data) {
  let errors = {};

  // Validate fullName
  data.fullName = !isEmpty(data.fullName) ? data.fullName : "";
  if (validator.isEmpty(data.fullName)) {
    errors.fullName = "Full name is required";
  }

  // Validate email
  data.email = !isEmpty(data.email) ? data.email : "";
  if (validator.isEmpty(data.email)) {
    errors.email = "Email is required";
  } else if (!validator.isEmail(data.email)) {
    errors.email = "Invalid email format";
  }

  // Optional: Validate skills
  if (data.skills && (!Array.isArray(data.skills) || data.skills.length > 10)) {
    errors.skills = "Skills must be an array with max 10 items";
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};