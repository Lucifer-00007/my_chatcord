const jwt = require('jsonwebtoken');
const { security } = require('../config/constants');
const User = require('../models/User');
const RoomBlock = require('../models/RoomBlock');

module.exports = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, security.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');
            
            if (!user) {
                return res.status(401).json({ message: 'Invalid token' });
            }

            // Check for room blocks if accessing room-specific routes
            if (req.originalUrl.includes('/channels/') && req.params.roomName) {
                const activeBlock = await RoomBlock.findOne({
                    user: user._id,
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

            // Attach user to request
            req.user = user;
            next();
        } catch (err) {
            console.error('Token verification failed:', err);
            res.status(401).json({ message: 'Token is not valid' });
        }
    } catch (err) {
        console.error('Auth middleware error:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
