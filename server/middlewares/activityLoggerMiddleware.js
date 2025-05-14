// middleware/activityLoggerMiddleware.js
const activityLogger = require('../utils/activityLogger');

const activityLoggerMiddleware = (req, res, next) => {
  // Add the logActivity method to the request object
  req.logActivity = async (action, details, actionType, relatedEntityId = null, relatedEntityType = null, metadata = {}) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user._id) {
        console.warn('No user ID available for activity logging');
        return;
      }

      // Call the activity logger utility to save the activity
      const activity = await activityLogger.log(
        req.user._id,
        action,
        details,
        actionType,
        relatedEntityId,
        relatedEntityType,
        metadata
      );

      return activity;
    } catch (error) {
      console.error('Error in activity logger middleware:', error);
      // Don't throw the error - we don't want activity logging failures to break the main request
    }
  };

  next();
};

module.exports = activityLoggerMiddleware;