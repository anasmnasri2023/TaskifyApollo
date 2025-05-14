const UserModel = require("../../models/users");
const { nodeMailer } = require("../../config/nodeMailer");
const jwt = require("jsonwebtoken");

// In-memory storage for OTP codes (in a production environment, use Redis or another persistent store)
const otpStore = new Map();

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via email
const sendOTPEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ email: "User not found" });
    }
    
    // Check if 2FA is enabled for this user
    if (!user.twoFactorEnabled) {
      return res.status(200).json({
        twoFactorRequired: false,
        message: "Two-factor authentication is not required for this user"
      });
    }
    
    // Generate OTP
    const otp = generateOTP();
    console.log(`\n=== ATTENTION ===`);
    console.log(`Generated OTP for ${email}: ${otp}`);
    console.log(`=== USE THIS CODE TO LOGIN ===\n`);
    
    // Store OTP with 5 minute expiration
    otpStore.set(email, {
      otp,
      expires: Date.now() + 5 * 60 * 1000 // 5 minutes
    });
    
    // Send email with OTP
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333; text-align: center;">Your Authentication Code</h2>
        <p style="font-size: 16px; color: #555;">Hello ${user.fullName || ''},</p>
        <p style="font-size: 16px; color: #555;">Your verification code for Taskify is:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4a6cf7; background: #f5f5f5; padding: 15px; border-radius: 5px; display: inline-block;">${otp}</div>
        </div>
        <p style="font-size: 16px; color: #555;">This code will expire in 5 minutes.</p>
        <p style="font-size: 16px; color: #555;">If you didn't request this code, please ignore this email.</p>
        <p style="font-size: 14px; color: #888; margin-top: 30px; text-align: center;">${new Date().getFullYear()} Taskify. All rights reserved.</p>
      </div>
    `;
    
    try {
      // Tenter d'envoyer l'email
      await nodeMailer(email, "Your Authentication Code", emailContent);
      
      // Pour les tests, on renvoie toujours l'OTP dans la réponse
      res.status(200).json({
        twoFactorRequired: true,
        message: "Verification code sent to your email",
        testOtp: otp // Uniquement pour les tests !
      });
    } catch (emailError) {
      // Même si l'envoi d'email échoue, on renvoie l'OTP pour les tests
      res.status(200).json({
        twoFactorRequired: true,
        message: "Failed to send verification code to your email, but you can use the code in the server logs",
        testOtp: otp // Uniquement pour les tests !
      });
    }
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    // Find user
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ email: "User not found" });
    }
    
    // Check if OTP exists and is valid
    const storedOTP = otpStore.get(email);
    if (!storedOTP) {
      return res.status(400).json({ otp: "Verification code expired or not found. Please request a new code." });
    }
    
    // Check if OTP has expired
    if (Date.now() > storedOTP.expires) {
      otpStore.delete(email);
      return res.status(400).json({ otp: "Verification code expired. Please request a new code." });
    }
    
    // Check if OTP matches
    if (storedOTP.otp !== otp) {
      return res.status(400).json({ otp: "Invalid verification code" });
    }
    
    // OTP is valid, remove it from store
    otpStore.delete(email);
    
    // Generate JWT token
    var token = jwt.sign(
      {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        roles: user.roles,
      },
      process.env.PRIVATE_KEY,
      { expiresIn: "1h" }
    );
    
    res.status(200).json({
      message: "Success",
      token: token,
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Check if 2FA is enabled for a user
const check2FAStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json({
      twoFactorEnabled: user.twoFactorEnabled
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Enable/disable 2FA for a user
const toggle2FA = async (req, res) => {
  try {
    const userId = req.user.id;
    const { enable } = req.body;
    
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { twoFactorEnabled: enable },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json({
      message: enable ? "Two-factor authentication enabled" : "Two-factor authentication disabled",
      twoFactorEnabled: user.twoFactorEnabled
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  sendOTPEmail,
  verifyOTP,
  check2FAStatus,
  toggle2FA
};
