const express = require('express');
const router = express.Router();
const Song = require('../models/Song');
const User = require('../models/User');
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
        const { type, year } = req.query; // 'album' or 'single', and the year (e.g. '2024')

        if (!year) return res.status(400).json({ message: 'Year is required' });

        let model;
        if (type === 'album') model = AlbumAnalytics;
        else if (type === 'single') model = SingleAnalytics;
        else return res.status(400).json({ message: 'Invalid type' });

        const monthlyData = [];

        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
            const startOfMonth = new Date(year, monthIndex, 1); // Start of the month
            const endOfMonth = new Date(year, monthIndex + 1, 0); // End of the month

            // Set the hours to include the entire day
            startOfMonth.setHours(0, 0, 0, 0);
            endOfMonth.setHours(23, 59, 59, 999);

            const results = await model.aggregate([
                { $match: { created_at: { $gte: startOfMonth, $lte: endOfMonth } } },
                { $group: {
                    _id: null,
                    totalAppleRevenue: { $sum: '$revenue.apple' },
                    totalSpotifyRevenue: { $sum: '$revenue.spotify' },
                }}
            ]);

            const totalData = results[0] || {
                totalAppleRevenue: 0,
                totalSpotifyRevenue: 0,
            };

            // Calculate total revenue and percentage value
            const totalRevenue = totalData.totalAppleRevenue + totalData.totalSpotifyRevenue;
            const percentageValue = totalRevenue ? 
                (totalData.totalAppleRevenue / totalRevenue) * 100 : 0;

            // Format month name
            const monthName = startOfMonth.toLocaleString('default', { month: 'short' });

            // Add data to the array
            monthlyData.push({
                percentageValue: percentageValue.toFixed(2), // Two decimal places
                month: monthName,
            });
        }

        // Return all monthly data
        res.json(monthlyData);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Get Total Apple and Spotify Revenue by Year
router.get('/analytics/revenue-yearly', async (req, res) => {
    try {
        const { type, Id, email } = req.query; // 'album' or 'single', Id, and email
        const currentDate = new Date();
        const startOfYear = new Date(currentDate.getFullYear(), 0, 1); // Start of the current year

        let model;
        if (type === 'album') model = AlbumAnalytics;
        else if (type === 'single') model = SingleAnalytics;
        else return res.status(400).json({ message: 'Invalid type' });

        // Log the ID and email being searched
        console.log(`Searching for song with ID: ${Id} and email: ${email}`);
        
        // Find the user by email
        const user = await User.findOne({ email: email.trim() });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Find the song by ID
        const song = await Song.findById(Id.trim());
        if (!song) return res.status(404).json({ message: 'Song not found' });

        const results = await model.aggregate([
            { 
                $match: { 
                    created_at: { $gte: startOfYear }, 
                    song_id: Id 
                } 
            }
        ]);

        const response = results[0] || {
            totalAppleRevenue: 0,
            totalSpotifyRevenue: 0,
            totalAppleStreams: 0,
            totalSpotifyStreams: 0,
            totalAppleStreamTime: 0,
            totalSpotifyStreamTime: 0
        };

        res.json({
            analytics: {
                apple: {
                    revenue: response.totalAppleRevenue,
                    streams: response.totalAppleStreams,
                    streamTime: response.totalAppleStreamTime
                },
                spotify: {
                    revenue: response.totalSpotifyRevenue,
                    streams: response.totalSpotifyStreams,
                    streamTime: response.totalSpotifyStreamTime
                },
                song: {
                    id: Id,
                    title: song.song_title,
                    albumId: song.album_id,
                },
                user: {
                    email: user.email,
                    balance: user.balance, // Include user balance if needed
                }
            }
        });
    } catch (error) {
        console.error(error); // Log error for debugging
        res.status(500).json({ message: error.message });
    }
});

router.post('/locations', async (req, res) => {
    const { email, location, album_sold, single_sold, streams, total } = req.body;
  
    try {
      const newLocation = new Location({
        email,
        location,
        album_sold,
        single_sold,
        streams,
        total
      });
  
      await newLocation.save();
      res.status(201).send({ message: 'Location created successfully', location: newLocation });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
  
  // Get all locations
router.get('/locations', async (req, res) => {
    try {
      const locations = await Location.find();
      res.status(200).send(locations);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
  
  // Get a location by email
  router.get('/locations/email/:email', async (req, res) => {
    const { email } = req.params;
  
    try {
      const locations = await Location.find({ email });
      if (locations.length === 0) {
        return res.status(404).send({ message: 'No locations found for this email' });
      }
      res.status(200).send(locations);
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
  
  // Update a location by email and ID
  router.put('/locations/:id/email/:email', async (req, res) => {
    const { id, email } = req.params;
    const { location, album_sold, single_sold, streams, total } = req.body;
  
    try {
      const updatedLocation = await Location.findOneAndUpdate(
        { _id: id, email },
        { location, album_sold, single_sold, streams, total },
        { new: true, runValidators: true }
      );
  
      if (!updatedLocation) {
        return res.status(404).send({ message: 'Location not found or email does not match' });
      }
      res.status(200).send({ message: 'Location updated successfully', location: updatedLocation });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });
  
  // Delete a location by email and ID
  router.delete('/locations/:id/email/:email', async (req, res) => {
    const { id, email } = req.params;
  
    try {
      const deletedLocation = await Location.findOneAndDelete({ _id: id, email });
      if (!deletedLocation) {
        return res.status(404).send({ message: 'Location not found or email does not match' });
      }
      res.status(200).send({ message: 'Location deleted successfully' });
    } catch (error) {
      res.status(500).send({ message: error.message });
    }
  });


module.exports = router;
