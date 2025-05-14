const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER_S,
    pass: process.env.GMAIL_KEY_S,
  },
});

// Refactored version with async/await
const sendLoginAlert = async (email, ip, location, device) => {
  console.log("✅ sendLoginAlert called for:", email);

  const mailOptions = {
    from: process.env.GMAIL_USER_S,
    to: email,
    subject: "Suspicious Login Detected",
    text: `🚨 We detected a login from a new device or location.\n\n📍 IP: ${ip}\n🌍 Location: ${location}\n💻 Device: ${device}`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Login alert sent:", info.response);
  } catch (err) {
    console.error("❌ Error sending email:", err);
  }
};

module.exports = sendLoginAlert;
