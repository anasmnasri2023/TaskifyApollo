const UserModel = require("../../models/users");
const bcrypt = require("bcryptjs");
const registerValidation = require("../../validation/usersValidation");
//mailer
const nodemailer = require("nodemailer");


function generatePassword(length) {
  var charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var password = "";
  for (var i = 0; i < length; i++) {
    var randomIndex = Math.floor(Math.random() * charset.length);
    password += charset.charAt(randomIndex);
  }
  return password;
}

//mailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "amolip42@gmail.com",
    pass: "oejg ravt conf napz", // Si c'est un mot de passe d'application, sinon voir ci-dessous
  },
  tls: {
    rejectUnauthorized: false, // Allow self-signed certs
  },
});

const Register = async (req, res) => {
  const { errors, isValid } = registerValidation(req.body);

  try {
    if (!isValid) {
      res.status(404).json(errors);
    } else {
      UserModel.findOne({ email: req.body.email }).then(async (exist) => {
        if (exist) {
          errors.email = "User exists";
          res.status(404).json(errors);
        } else {
          req.body.authType = 'local';
          const hash = bcrypt.hashSync(req.body.password, 10); //hashed password
          req.body.password = hash;
          if (Array.isArray(req.body.roles)) {
            req.body.roles = req.body.roles.map((role) =>
                typeof role === "object" ? role.value : role
            );
        } else if (typeof req.body.roles === "string") {
            req.body.roles = [req.body.roles]; // Convert string to array
        } else {
            req.body.roles = []; // Default to an empty array
        }
          const data = await UserModel.create(req.body);
          if(!req.body.picture) {

          //mailer
          const signInLink = "http://localhost:5173/auth/SignIn";

          const info = await transporter.sendMail({
            from: '"Support Taskify" <amolip42@gmail.com>',
            to: req.body.email, // Envoi au nouvel utilisateur
            subject: "Votre compte est maintenant actif",
            text: `Bonjour ${req.body.fullName || "utilisateur"},

                Bienvenue sur Taskify ! Votre compte est activé.

                pour commencer, cliquez sur le lien ci-dessous pour vous connecter :
               ${signInLink}

              Si vous avez des questions, contactez-nous à contact@taskify.com.
            `,
          });
        }
      


          res.status(200).json({ message: "Success", data });
        }
      });
    }
  } catch (error) {
    res.status(404).json(error.message);
  }
};

module.exports = Register;