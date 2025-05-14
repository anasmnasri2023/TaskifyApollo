"use strict";

const nodemailer = require("nodemailer");
require("dotenv").config();

// Log pour débogage
console.log("NodeMailer: Loading environment variables");
console.log(`NodeMailer: AGMAIL_USER from env: ${process.env.AGMAIL_USER}`);

// Fonction principale pour envoyer un email
async function main(to, subject, content) {
  console.log(`NodeMailer: Preparing to send email to ${to}`);

  try {
    const gmailUser = process.env.AGMAIL_USER;
    const gmailKey = process.env.AGMAIL_KEY;

    console.log(`NodeMailer: Using GMAIL_USER: ${gmailUser}`);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailKey,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const message = {
      from: `"Taskify App" <${gmailUser}>`,
      to: to,
      subject: subject,
      html: content,
    };

    if (process.env.SKIP_EMAIL_SENDING === "true") {
      console.log("NodeMailer: Email sending skipped due to SKIP_EMAIL_SENDING=true");
      return { response: "Email sending skipped" };
    }

    return new Promise((resolve, reject) => {
      transporter.sendMail(message, (err, info) => {
        if (err) {
          console.error("NodeMailer Error:", err);
          reject(err);
        } else {
          console.log("NodeMailer Success:", info.response);
          resolve(info);
        }
      });
    });
  } catch (error) {
    console.error("NodeMailer Critical Error:", error);
    throw error;
  }
}

const nodeMailer = async (to, subject, content) => {
  try {
    await main(to, subject, content);
    console.log(`Email sent to: ${to}`);
    return true;
  } catch (error) {
    console.error("NodeMailer Function Error:", error);
    return false;
  }
};

module.exports = {
  nodeMailer,
};
