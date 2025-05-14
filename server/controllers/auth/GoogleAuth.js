// controllers/auth/GoogleAuth.js
const axios = require('axios');
const jwt = require('jsonwebtoken');
const UserModel = require('../../models/users');
require('dotenv').config();

// Get environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;

// Debug environment variables at startup
console.log('Google OAuth Config:', {
  clientIdExists: !!CLIENT_ID,
  clientSecretExists: !!CLIENT_SECRET,
  redirectUriExists: !!REDIRECT_URI
});

// Helper function for retrying API calls
const fetchWithRetry = async (url, options, maxRetries = 3) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await axios(url, options);
    } catch (error) {
      console.log(`Attempt ${i + 1} failed, retrying in ${i * 500}ms...`);
      lastError = error;
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, i * 500));
    }
  }
  
  throw lastError;
};

const getAccessTokenGoogle = async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).json({ error: 'Authorization code is missing' });
  }
  
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    console.error('Missing required environment variables for Google OAuth');
    return res.status(500).json({ 
      error: 'Server configuration error',
      details: 'OAuth credentials not properly configured'
    });
  }

  try {
    console.log(`Processing OAuth code: ${code.substring(0, 10)}...`);
    
    // Use retry logic for the token request
    const tokenResponse = await fetchWithRetry(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        url: 'https://oauth2.googleapis.com/token',
        data: {
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const { access_token, id_token } = tokenResponse.data;
    console.log('Successfully obtained Google access token');
    
    res.json({ access_token, id_token });
  } catch (error) {
    console.error('Error getting Google access token:', error.response?.data || error.message);
    
    // Send a more descriptive error
    res.status(500).json({ 
      error: 'Failed to obtain Google access token',
      details: error.response?.data || error.message
    });
  }
};

const getUserDataGoogle = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    // Use retry logic for getting user info
    const response = await fetchWithRetry(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        method: 'GET',
        url: 'https://www.googleapis.com/oauth2/v2/userinfo',
        headers: {
          Authorization: `Bearer ${token}`,
        }
      }
    );
    
    const userData = response.data;
    console.log("User data retrieved from Google:", {
      name: userData.name,
      email: userData.email,
      id: userData.id
    });
    
    // Find or create user with retry logic
    try {
      // Find existing user
      let user = await UserModel.findOne({ email: userData.email });
      
      if (!user) {
        // Create a new user with Google authentication
        user = new UserModel({
          fullName: userData.name || 'Google User',
          email: userData.email,
          picture: userData.picture,
          roles: 'ENGINEER',
          authType: 'google',
          oauthProviderId: userData.id
        });
        
        // Save the user without validating password
        await user.save();
        console.log('New user created with Google OAuth:', user.email);
      } else {
        // Update existing user's OAuth info if needed
        if (!user.authType) {
          user.authType = 'google';
          user.picture = userData.picture;
          await user.save();
          console.log('Updated existing user with authType:', user.email);
        }
      }
      
      // Generate JWT token
      const jwtToken = jwt.sign(
        {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          picture: user.picture,
          roles: user.roles,
          authType: user.authType
        },
        process.env.PRIVATE_KEY,
        { expiresIn: "1h" }
      );
      
      res.status(200).json({
        message: "Success",
        token: jwtToken,
        user: user
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      res.status(500).json({ 
        error: 'Database operation failed',
        details: dbError.message
      });
    }
  } catch (error) {
    console.error('Error fetching Google user data:', error);
    
    // Send a more descriptive error
    res.status(500).json({ 
      error: 'Failed to fetch user data from Google',
      details: error.message
    });
  }
};

module.exports = { getAccessTokenGoogle, getUserDataGoogle };