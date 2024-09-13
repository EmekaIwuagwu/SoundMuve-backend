const express = require('express');
const router = express.Router();
const { AlbumAnalytics, SingleAnalytics, Store, Location } = require('../models/AnalyticsSchema');
const jwt = require('jsonwebtoken');

// Middleware to check token
const checkToken = (req, res, next) => {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(422).json({ message: 'Please provide a Bearer token!' });
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    // Verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token!' });
        }

        // Attach user info to request object
        req.user = decoded;
        next();
    });
};

// Apply middleware to all routes
router.use(checkToken);

// Create Album Analytics
router.post('/album-analytics', async (req, res) => {
    try {
        const albumAnalytics = new AlbumAnalytics(req.body);
        await albumAnalytics.save();
        res.status(201).json({ message: 'Album Analytics created successfully!', data: albumAnalytics });
    } catch (error) {
        res.status(400).json({ message: 'Failed to create Album Analytics.', error: error.message });
    }
});

// Read Album Analytics
router.get('/album-analytics/:id', async (req, res) => {
    try {
        const albumAnalytics = await AlbumAnalytics.findById(req.params.id);
        if (!albumAnalytics) return res.status(404).json({ message: 'Album Analytics not found.' });
        res.json({ message: 'Album Analytics retrieved successfully!', data: albumAnalytics });
    } catch (error) {
        res.status(400).json({ message: 'Failed to retrieve Album Analytics.', error: error.message });
    }
});

// Update Album Analytics
router.put('/album-analytics/:id', async (req, res) => {
    try {
        const albumAnalytics = await AlbumAnalytics.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!albumAnalytics) return res.status(404).json({ message: 'Album Analytics not found.' });
        res.json({ message: 'Album Analytics updated successfully!', data: albumAnalytics });
    } catch (error) {
        res.status(400).json({ message: 'Failed to update Album Analytics.', error: error.message });
    }
});

// Delete Album Analytics
router.delete('/album-analytics/:id', async (req, res) => {
    try {
        const albumAnalytics = await AlbumAnalytics.findByIdAndDelete(req.params.id);
        if (!albumAnalytics) return res.status(404).json({ message: 'Album Analytics not found.' });
        res.json({ message: 'Album Analytics deleted successfully!' });
    } catch (error) {
        res.status(400).json({ message: 'Failed to delete Album Analytics.', error: error.message });
    }
});

// Repeat similar routes for SingleAnalytics, Store, and Location

// Get Total Apple and Spotify Revenue by Month
router.get('/analytics/revenue-monthly', async (req, res) => {
    try {
        const { type } = req.query; // 'album' or 'single'
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        endOfMonth.setHours(23, 59, 59, 999);

        let model;
        if (type === 'album') model = AlbumAnalytics;
        else if (type === 'single') model = SingleAnalytics;
        else return res.status(400).json({ message: 'Invalid type' });

        const results = await model.aggregate([
            { $match: { created_at: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: {
                _id: null,
                totalAppleRevenue: { $sum: '$revenue.apple' },
                totalSpotifyRevenue: { $sum: '$revenue.spotify' },
                totalAppleStreams: { $sum: '$stream.apple' },
                totalSpotifyStreams: { $sum: '$stream.spotify' }
            }}
        ]);

        res.json(results[0] || {
            totalAppleRevenue: 0,
            totalSpotifyRevenue: 0,
            totalAppleStreams: 0,
            totalSpotifyStreams: 0
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
