const nodemailer = require("nodemailer");
require('dotenv').config();

async function testEmail() {
  console.log("Test Email: Starting email test");
  console.log(`Test Email: GMAIL_USER from env: ${process.env.GMAIL_USER}`);
  console.log(`Test Email: GMAIL_KEY from env: ${process.env.GMAIL_KEY}`);
  
  try {
    // Créer un transporteur avec les informations d'identification Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_KEY
      }
    });

    // Adresse email de test - remplacez par une adresse que vous pouvez vérifier
    const testEmail = "yasmine.attia12@gmail.com"; 

    // Contenu de l'email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: testEmail,
      subject: 'Test Email from Taskify App',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Test Email</h2>
          <p>Ceci est un email de test de l'application Taskify.</p>
          <p>Si vous recevez cet email, cela signifie que la configuration d'email fonctionne correctement.</p>
          <p>Heure d'envoi: ${new Date().toLocaleString()}</p>
        </div>
      `
    };

    // Envoyer l'email
    console.log(`Test Email: Attempting to send email to ${testEmail}`);
    const info = await transporter.sendMail(mailOptions);
    console.log('Test Email: Email sent successfully!');
    console.log('Test Email: Response:', info.response);
    return info;
  } catch (error) {
    console.error('Test Email: Error sending email:', error);
    throw error;
  }
}

// Exécuter le test
testEmail()
  .then(() => console.log('Test Email: Test completed successfully'))
  .catch(err => console.error('Test Email: Test failed with error:', err));
