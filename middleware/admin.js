const adminAuth = async function(req, res, next) {
    try {
        // Check if user exists and is authenticated (should be set by authMiddleware)
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Check if user is an admin
        if (!req.user.isAdmin) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        next();
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { adminAuth };
