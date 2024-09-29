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
        const { type, month } = req.query; // 'album' or 'single', and the month (e.g. '2024-01' for January 2024)

        if (!month) return res.status(400).json({ message: 'Month is required' });

        const startOfMonth = new Date(month + '-01'); // Start of the month
        const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0); // End of the month

        // Set the hours to include the entire day
        startOfMonth.setHours(0, 0, 0, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        let model;
        if (type === 'album') model = AlbumAnalytics;
        else if (type === 'single') model = SingleAnalytics;
        else return res.status(400).json({ message: 'Invalid type' });

        const results = await model.aggregate([
            { $match: { created_at: { $gte: startOfMonth, $lte: endOfMonth } } },
            { $group: {
                _id: { day: { $dayOfMonth: '$created_at' } }, // Group by day of the month
                totalAppleRevenue: { $sum: '$revenue.apple' },
                totalSpotifyRevenue: { $sum: '$revenue.spotify' },
                totalAppleStreams: { $sum: '$stream.apple' },
                totalSpotifyStreams: { $sum: '$stream.spotify' },
                count: { $sum: 1 }
            }},
            { $sort: { '_id.day': 1 } } // Sort by day of the month
        ]);

        // Format the response to have a daily summary
        const formattedResults = Array.from({ length: endOfMonth.getDate() }, (_, i) => {
            const dayResult = results.find(result => result._id.day === i + 1);
            return {
                day: i + 1,
                totalAppleRevenue: dayResult ? dayResult.totalAppleRevenue : 0,
                totalSpotifyRevenue: dayResult ? dayResult.totalSpotifyRevenue : 0,
                totalAppleStreams: dayResult ? dayResult.totalAppleStreams : 0,
                totalSpotifyStreams: dayResult ? dayResult.totalSpotifyStreams : 0
            };
        });

        res.json(formattedResults);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});


// Get Total Apple and Spotify Revenue by Year
router.get('/analytics/revenue-yearly', async (req, res) => {
    try {
        const { type } = req.query; // 'album' or 'single'
        const currentDate = new Date();
        const startOfYear = new Date(currentDate.getFullYear(), 0, 1); // Start of the current year

        let model;
        if (type === 'album') model = AlbumAnalytics;
        else if (type === 'single') model = SingleAnalytics;
        else return res.status(400).json({ message: 'Invalid type' });

        const results = await model.aggregate([
            { $match: { created_at: { $gte: startOfYear } } },
            { $group: {
                _id: null,
                totalAppleRevenue: { $sum: '$revenue.apple' },
                totalSpotifyRevenue: { $sum: '$revenue.spotify' },
                totalAppleStreams: { $sum: '$stream.apple' },
                totalSpotifyStreams: { $sum: '$stream.spotify' },
                totalAppleStreamTime: { $sum: { $multiply: ['$stream.apple', 3] } }, // Assuming each stream takes 3 minutes as an example
                totalSpotifyStreamTime: { $sum: { $multiply: ['$stream.spotify', 3] } } // Assuming each stream takes 3 minutes as an example
            }}
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
                    streamTime: response.totalAppleStreamTime // Total stream time for Apple
                },
                spotify: {
                    revenue: response.totalSpotifyRevenue,
                    streams: response.totalSpotifyStreams,
                    streamTime: response.totalSpotifyStreamTime // Total stream time for Spotify
                }
            }
        });
    } catch (error) {
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
