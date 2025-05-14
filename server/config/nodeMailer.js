"use strict";
const nodemailer = require("nodemailer");
require('dotenv').config();

// Log pour débogage
console.log("NodeMailer: Loading environment variables");
console.log(`NodeMailer: GMAIL_USER from env: ${process.env.GMAIL_USER}`);

// Fonction principale pour envoyer un email
async function main(to, subject, content) {
  console.log(`NodeMailer: Preparing to send email to ${to}`);
  
  try {
    // Utiliser les informations d'identification depuis les variables d'environnement
    const gmailUser = process.env.GMAIL_USER;
    const gmailKey = process.env.GMAIL_KEY;
    
    console.log(`NodeMailer: Using GMAIL_USER: ${gmailUser}`);
    
    // Créer un objet transporteur réutilisable en utilisant le transport SMTP par défaut
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // true pour le port 465, false pour les autres ports
      auth: {
        user: gmailUser,
        pass: gmailKey,
      },
      tls: {
        rejectUnauthorized: false // Accepter les certificats auto-signés
      }
    });

    const message = {
      from: `"Taskify App" <${gmailUser}>`, // adresse de l'expéditeur
      to: to, // liste des destinataires
      subject: subject, // Ligne d'objet
      html: content, // Utiliser le paramètre de contenu directement
    };
    
    console.log(`NodeMailer: Sending email from ${gmailUser} to ${to}`);
    
    // Vérifier si l'envoi d'email doit être ignoré (pour les tests)
    if (process.env.SKIP_EMAIL_SENDING === 'true') {
      console.log("NodeMailer: Email sending skipped due to SKIP_EMAIL_SENDING=true");
      return { response: "Email sending skipped" };
    }
    
    // Envoyer un email avec l'objet transporteur défini
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
