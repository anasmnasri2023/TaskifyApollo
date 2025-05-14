require('dotenv').config();
const mongoose = require('mongoose');
const UserModel = require('../models/users');

// Connexion à MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => {
    console.error('MongoDB Connection Error:', err);
    process.exit(1);
  });

// Fonction pour désactiver la 2FA pour tous les utilisateurs
async function disable2FAForAllUsers() {
  try {
    console.log('Désactivation de la 2FA pour tous les utilisateurs...');
    
    // Mettre à jour tous les utilisateurs
    const result = await UserModel.updateMany(
      {}, // Tous les utilisateurs
      { twoFactorEnabled: false } // Désactiver la 2FA
    );
    
    console.log(`2FA désactivée pour ${result.modifiedCount} utilisateurs.`);
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la désactivation de la 2FA:', error);
    process.exit(1);
  }
}

// Exécuter la fonction
disable2FAForAllUsers();
