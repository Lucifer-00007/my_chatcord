const VoiceApi = require('../models/VoiceApi');

class TokenManager {
    static async getToken(api) {
        try {
            // Check if we have a valid token
            if (api.auth.currentToken && api.auth.tokenExpiry > new Date()) {
                return api.auth.currentToken;
            }

            // Get new token
            const response = await fetch(api.auth.loginEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: api.auth.credentials.username,
                    password: api.auth.credentials.password
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to get token');
            }

            // Extract token using tokenPath
            let token = data;
            const pathParts = api.auth.tokenPath.split('.');
            for (const part of pathParts) {
                token = token[part];
            }

            if (!token) {
                throw new Error('Token not found in response');
            }

            // Update API with new token
            const tokenExpiry = new Date();
            tokenExpiry.setHours(tokenExpiry.getHours() + 23); // Set expiry to 23 hours

            await VoiceApi.findByIdAndUpdate(api._id, {
                'auth.currentToken': token,
                'auth.tokenExpiry': tokenExpiry
            });

            return token;
        } catch (err) {
            console.error('Token refresh error:', err);
            throw err;
        }
    }
}

module.exports = TokenManager;
