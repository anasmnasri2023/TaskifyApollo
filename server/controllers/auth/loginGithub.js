// Updated GitHub OAuth backend controller
const axios = require("axios");
const jwt = require('jsonwebtoken');
const UserModel = require('../../models/users');
require('dotenv').config();

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// Debug configuration
console.log('GitHub OAuth Config:', {
  clientIdExists: !!CLIENT_ID,
  clientSecretExists: !!CLIENT_SECRET
});

console.log('[GitHub Auth] Debug - Client ID Length:', CLIENT_ID?.length);
console.log('[GitHub Auth] Debug - Client Secret Length:', CLIENT_SECRET?.length);

const getAcessToken = async (req, res) => {
    const { code, state } = req.query;

    console.log('[GitHub Auth] Token request received', { 
      codeExists: !!code, 
      stateExists: !!state 
    });

    if (!code) {
        return res.status(400).json({ error: "Authorization code is missing" });
    }

    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.error('[GitHub Auth] Missing required environment variables');
        return res.status(500).json({ 
            error: 'Server configuration error',
            details: 'GitHub OAuth credentials not properly configured'
        });
    }

    try {
        console.log(`[GitHub Auth] Processing OAuth code with GitHub`);
        
        // Request the access token from GitHub
        const response = await axios.post('https://github.com/login/oauth/access_token', null, {
            params: {
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code,
                // Include state if it was provided
                ...(state && { state })
            },
            headers: {
                'Accept': 'application/json',
            },
        });

        const { access_token, error } = response.data;
        
        if (error) {
            console.error('[GitHub Auth] GitHub API returned an error:', error);
            return res.status(400).json({ 
                error: `GitHub API error: ${error}`,
                details: response.data.error_description
            });
        }

        if (!access_token) {
            console.error('[GitHub Auth] No access token in GitHub response');
            return res.status(400).json({ 
                error: 'No access token received from GitHub',
                details: 'GitHub did not provide an access token in its response'
            });
        }

        console.log('[GitHub Auth] Successfully obtained GitHub access token');
        
        // Return state parameter along with token for frontend validation
        res.json({ 
            access_token,
            state // Return the state parameter to allow frontend validation
        });
    } catch (error) {
        console.error('[GitHub Auth] Error getting access token:', error);
        
        // Provide more detailed error information
        res.status(500).json({ 
            error: 'Failed to obtain GitHub access token',
            details: error.response?.data || error.message
        });
    }
};

// Function to fetch user data from GitHub and return a JWT token
const getUsertData = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: "Authorization header missing" });
        }

        const token = authHeader.split(' ')[1];
        console.log("[GitHub Auth] Token received for user data request");

        // Get basic user info
        const response = await axios.get('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        console.log('[GitHub Auth] Received user data from GitHub API');

        // Try to get email - it might not be public in the profile
        let userEmail = response.data.email;
        if (!userEmail) {
            console.log('[GitHub Auth] Email not found in profile, fetching emails');
            const emailsResponse = await axios.get('https://api.github.com/user/emails', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const primaryEmail = emailsResponse.data.find(email => email.primary && email.verified);
            userEmail = primaryEmail ? primaryEmail.email : null;
            console.log(`[GitHub Auth] Found primary email: ${userEmail ? 'Yes' : 'No'}`);
        }

        if (!userEmail) {
            return res.status(400).json({ error: "Email not available from GitHub" });
        }

        // Find or create the user
        let user = await UserModel.findOne({ email: userEmail });
        if (!user) {
            console.log(`[GitHub Auth] Creating new user for: ${userEmail}`);
            user = new UserModel({
                fullName: response.data.name || response.data.login,
                email: userEmail,
                picture: response.data.avatar_url,
                roles: 'ENGINEER', // Use a consistent default role
                authType: 'github',
                oauthProviderId: response.data.id.toString()
            });
            await user.save();
        } else {
            console.log(`[GitHub Auth] Found existing user: ${userEmail}`);
            // Update user info if needed
            if (!user.authType || !user.oauthProviderId) {
                user.authType = 'github';
                user.oauthProviderId = response.data.id.toString();
                user.picture = user.picture || response.data.avatar_url;
                await user.save();
                console.log(`[GitHub Auth] Updated user with GitHub auth info`);
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
            },
            process.env.PRIVATE_KEY,
            { expiresIn: "1h" }
        );

        console.log(`[GitHub Auth] Authentication successful for ${userEmail}`);

        // Return user data and token
        res.status(200).json({
            message: "Success",
            token: jwtToken,
            // Only return minimal user info
            userInfo: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                picture: user.picture,
                roles: user.roles
            }
        });
    } catch (error) {
        console.error('[GitHub Auth] Error fetching user data from GitHub:', error);
        res.status(500).json({ 
            error: 'Failed to fetch user data from GitHub',
            details: error.response?.data || error.message
        });
    }
};

module.exports = { getAcessToken, getUsertData };