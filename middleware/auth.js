const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RoomBlock = require('../models/RoomBlock');

module.exports = async function (req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.userId).select('-password');
        if (!req.user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Check for room blocks if accessing room-specific routes
        if (req.originalUrl.includes('/channels/') && req.params.roomName) {
            const activeBlock = await RoomBlock.findOne({
                user: req.user._id,
                room: req.params.roomName,
                isActive: true,
                endDate: { $gt: new Date() }
            });

            if (activeBlock) {
                return res.status(403).json({
                    message: 'You are blocked from this room',
                    blockEndDate: activeBlock.endDate,
                    code: 'ROOM_BLOCKED'
                });
            }
        }

        next();
    } catch (err) {
        // Handle malformed or invalid token
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid or malformed token' });
        }
        // Handle expired token
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        // For any other error, pass to default error handler
        next(err);
    }
};
