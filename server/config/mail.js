// config/mail.js
const nodemailer = require("nodemailer");

// Create a reusable transporter with Ethereal
async function createTransporter() {
  // Generate a test account
  const testAccount = await nodemailer.createTestAccount();
  
  // Create a transporter using the test account
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  
  return { transporter, testAccount };
}

// Function to send suspicious login alerts
const sendSuspiciousLoginAlert = async function(user, loginDetails) {
  try {
    console.log("Attempting to send security alert to:", user.email);
    
    // Create the transporter for this email
    const { transporter, testAccount } = await createTransporter();
    
    // Create device info string
    const deviceInfo = loginDetails.deviceInfo || {};
    const deviceInfoString = `${deviceInfo.browser || 'Unknown'} on ${deviceInfo.os || 'Unknown'} (${deviceInfo.device || 'Unknown'})`;
    
    // Create reasons list
    const reasonsList = loginDetails.suspiciousReason && loginDetails.suspiciousReason.length > 0 
      ? loginDetails.suspiciousReason.map(reason => `<li>${reason}</li>`).join('')
      : '<li>Unusual login pattern detected</li>';
    
    const mailOptions = {
      from: '"Taskify Security" <security@taskify.com>',
      to: user.email,
      subject: "Security Alert: Suspicious Login Detected",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd;">
          <h2 style="color: #d9534f;">Security Alert: Suspicious Login Detected</h2>
          <p>Hello ${user.fullName || user.email},</p>
          <p>We detected a suspicious login to your account at ${new Date(loginDetails.timestamp).toLocaleString()}.</p>
          <p><strong>Device:</strong> ${deviceInfoString}</p>
          <p><strong>IP Address:</strong> ${loginDetails.ipAddress || 'Unknown'}</p>
          
          <p><strong>Why was this login flagged?</strong></p>
          <ul>
            ${reasonsList}
          </ul>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #d9534f; font-weight: bold;">If this wasn't you:</p>
            <p>1. Change your password immediately</p>
            <p>2. Review your recent account activity</p>
            <p>3. Contact our support team if needed</p>
          </div>
        </div>
      `
    };
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    
    // Log the result
    console.log('Email sent successfully');
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    
    // Return the preview URL so you can see the email
    return {
      success: true,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  sendSuspiciousLoginAlert
};