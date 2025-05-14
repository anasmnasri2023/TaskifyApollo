const express = require('express');
const router = express.Router();
const { sendSuspiciousLoginAlert } = require('../config/mail');

router.get('/', (req, res) => {
  // Create fake test data
  const testUser = {
    email: 'sarah.hania15@gmail.com', // or whatever email you want to test with
    fullName: 'Test User'
  };
  
  const testLoginDetails = {
    timestamp: new Date(),
    ipAddress: '192.168.1.87',
    deviceInfo: {
      browser: 'Chrome',
      os: 'Windows',
      device: 'Desktop'
    }
  };
  
  // Try to send the test email
  sendSuspiciousLoginAlert(testUser, testLoginDetails)
    .then(result => {
      if (result) {
        res.status(200).json({ message: 'Test email sent successfully!' });
      } else {
        res.status(500).json({ message: 'Failed to send test email' });
      }
    })
    .catch(err => {
      res.status(500).json({ message: 'Error sending email', error: err.message });
    });
});

module.exports = router;
