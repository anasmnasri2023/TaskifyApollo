const UserModel = require("../../models/users");
const LoginActivity = require("../../models/LoginActivity");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const loginValidation = require("../../validation/loginValidation");
const { checkSuspiciousLogin } = require("../../config/loginSecurity");
const { sendSuspiciousLoginAlert } = require("../../config/mail");

// Mode test pour désactiver temporairement la 2FA
const TEST_MODE = false; // Mettre à false pour activer la 2FA

// Helper function to record login activity
function recordLoginActivity(user, req, isSuccessful, is2FARequired = false) {
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers["user-agent"];

  // Only check for suspicious activity on successful logins
  if (isSuccessful) {
    return checkSuspiciousLogin(user._id, ipAddress, userAgent)
      .then((suspiciousCheck) => {
        // Create login activity record
        const loginActivity = new LoginActivity({
          user: user._id,
          timestamp: new Date(),
          ipAddress,
          userAgent,
          successful: isSuccessful,
          isSuspicious: suspiciousCheck.isSuspicious,
          suspiciousReason: suspiciousCheck.reasons,
          twoFactorRequired: is2FARequired,
        });

        // Save login activity
        return loginActivity.save().then(() => {
          // Send alert if suspicious
          if (isSuccessful && suspiciousCheck.isSuspicious) {
            return Promise.resolve().then(async () => {
              try {
                const result = await sendSuspiciousLoginAlert(
                  user,
                  loginActivity
                );
                console.log("Email alert result:", result);
                return {
                  isSuspicious: suspiciousCheck.isSuspicious,
                  reasons: suspiciousCheck.reasons,
                  emailSent: true,
                  emailPreviewUrl: result.previewUrl,
                };
              } catch (error) {
                console.error("Error sending email alert:", error);
                return {
                  isSuspicious: suspiciousCheck.isSuspicious,
                  reasons: suspiciousCheck.reasons,
                  emailSent: false,
                };
              }
            });
          }

          return {
            isSuspicious: suspiciousCheck.isSuspicious,
            reasons: suspiciousCheck.reasons,
          };
        });
      })
      .catch((error) => {
        console.error("Error recording login activity:", error);
        return { isSuspicious: false };
      });
  } else {
    // For failed logins, don't check for suspicious activity
    const loginActivity = new LoginActivity({
      user: user._id,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      successful: false,
      isSuspicious: false,
      twoFactorRequired: false,
    });

    return loginActivity
      .save()
      .then(() => {
        return { isSuspicious: false };
      })
      .catch((error) => {
        console.error("Error recording failed login activity:", error);
        return { isSuspicious: false };
      });
  }
}

const Login = async (req, res) => {
  console.log("🔍 Login attempt for:", req.body.email);

  const { errors, isValid } = loginValidation(req.body);
  console.log("🔍 Validation result:", { isValid, errors });

  if (!isValid) {
    console.log("❌ Validation failed:", errors);
    return res.status(400).json({ errors });
  }

  try {
    const user = await UserModel.findOne({ email: req.body.email });
    console.log("🔍 User lookup:", user ? user.email : "Not found");

    if (!user) {
      console.log("❌ User does not exist:", req.body.email);
      return res.status(400).json({ errors: { email: "User does not exist" } });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.password);
    console.log("🔍 Password match:", isMatch);

    if (!isMatch) {
      console.log("❌ Incorrect password for:", req.body.email);
      await recordLoginActivity(user, req, false);
      return res.status(400).json({ errors: { password: "Incorrect password" } });
    }

    // Check if 2FA is enabled for this user
    if (user.twoFactorEnabled === true && !TEST_MODE) {
      console.log("🔍 2FA required for:", user.email);
      await recordLoginActivity(user, req, true, true);
      // Log 2FA required activity
      if (req.logActivity) {
        await req.logActivity(
          "2FA Login Required",
          `2FA required for login from ${req.ip || req.connection.remoteAddress}`,
          "login_2fa_required",
          user._id,
          "User"
        );
      }
      return res.status(200).json({
        message: "2FA_REQUIRED",
        email: user.email,
        twoFactorRequired: true,
      });
    }

    // Record successful login
    const securityCheck = await recordLoginActivity(user, req, true);
    console.log("🔍 Security check:", securityCheck);

    // Log successful login
    if (req.logActivity) {
      await req.logActivity(
        "User Login",
        `Login from ${req.ip || req.connection.remoteAddress}`,
        "login",
        user._id,
        "User",
        { isSuspicious: securityCheck.isSuspicious }
      );
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        roles: user.roles,
      },
      process.env.PRIVATE_KEY,
      { expiresIn: "1h" }
    );
    console.log("🔍 Generated token:", token);

    // Add security alert to response if suspicious login detected
    const response = {
      message: "Success",
      token,
    };

    if (securityCheck.isSuspicious) {
      response.securityAlert = {
        message: "Suspicious login detected. A security alert has been sent to your email.",
        reasons: securityCheck.reasons,
      };
      if (securityCheck.emailPreviewUrl) {
        response.securityAlert.emailPreviewUrl = securityCheck.emailPreviewUrl;
      }
    }

    console.log("✅ Login successful for:", user.email);
    res.status(200).json(response);
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ errors: { server: "Internal server error" } });
  }
};

module.exports = Login;