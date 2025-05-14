// routes/predictionRoutes.js
const express = require('express');
const router = express.Router();
const predictionController = require('../controllers/predictionController');

// No auth middleware for testing
router.get('/tasks/:id/prediction', predictionController.GetTaskPrediction);
router.get('/tasks/predictions', predictionController.GetAllTaskPredictions);
router.get('/users/productivity', predictionController.GetUserProductivityScores);

module.exports = router;