const express = require('express');

const router = express.Router();
const path = require('path');

// Import admin route modules
router.use('/image-apis', require('./admin/image-apis'));
router.use('/voice-settings', require('./admin/voice-settings'));
router.use('/room-management', require('./admin/room-management'));
router.use('/stats', require('./admin/stats'));
router.use('/logs', require('./admin/logs'));
router.use('/settings', require('./admin/settings'));
router.use('/users', require('./admin/users'));
router.use('/voice', require('./admin/voice'));
router.use('/ai-apis', require('./admin/ai-apis'));
router.use('/image-settings', require('./admin/image-settings'));

// Serve admin pages
router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/dashboard.html'));
});

router.get('/user-management', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/user-management.html'));
});

router.get('/room-management', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/room-management.html'));
});

router.get('/system-settings', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/system-settings.html'));
});

router.get('/system-logs', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/system-logs.html'));
});

router.get('/ai-chat', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/ai-chat.html'));
});

router.get('/text-to-voice', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/text-to-voice.html'));
});

router.get('/text-to-image', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin/text-to-image.html'));
});

module.exports = router;
