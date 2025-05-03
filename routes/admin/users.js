const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const auth = require('../../middleware/auth');
const { adminAuth } = require('../../middleware/admin');

// Add authentication to all routes
router.use(auth);
router.use(adminAuth);

// Get all users
router.get('/', async (req, res) => {
    try {
        const users = await User.find()
            .select('username email isAdmin createdAt')
            .sort('username');
        
        if (!users) {
            return res.status(404).json({ message: 'No users found' });
        }
        
        console.log('Found users:', users.length);
        res.json(users);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Search users
router.get('/search', async (req, res) => {
    try {
        const searchQuery = req.query.q || '';
        const searchRegex = new RegExp(searchQuery, 'i');

        const users = await User.find({
            $or: [
                { username: searchRegex },
                { email: searchRegex }
            ]
        })
        .select('username email')
        .sort('username')
        .limit(10);

        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Error searching users' });
    }
});

// Get single user by ID
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('username email isAdmin createdAt');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new user
router.post('/', async (req, res) => {
    try {
        const { username, email, password, isAdmin } = req.body;

        // Validate inputs
        if (!username || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be 6 or more characters' });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Please include a valid email' });
        }

        // Check if user exists
        let user = await User.findOne({ $or: [{ email }, { username }] });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        user = new User({
            username,
            email,
            password,
            isAdmin: isAdmin || false
        });

        await user.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    try {
        const { username, email, isAdmin } = req.body;
        const updateData = { username, email, isAdmin };

        if (req.body.password) {
            updateData.password = req.body.password;
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete user
router.delete('/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json({ message: 'User removed' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
