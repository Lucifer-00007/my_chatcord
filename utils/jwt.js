const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  if (!userId) {
    throw new Error('User ID is required for token generation');
  }
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });
};

const verifyToken = (token) => {
  if (!token) {
    throw new Error('Token is required for verification');
  }
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    console.error('Token verification failed:', err.message);
    throw new Error('Invalid token');
  }
};

module.exports = { generateToken, verifyToken };
