const express = require('express');
const moment = require('moment');
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

// Get Total Apple and Spotify Revenue by Month for a User
router.get('/analytics/revenue-monthly', async (req, res) => {
    try {
        const { type, year, email } = req.query; // 'album' or 'single', and the year (e.g. '2024')

        if (!year) return res.status(400).json({ message: 'Year is required' });
        if (!email) return res.status(400).json({ message: 'Email is required' });

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
                {
                    $match: {
                        created_at: { $gte: startOfMonth, $lte: endOfMonth },
                        email: email // Filter by email
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalAppleRevenue: { $sum: '$revenue.apple' },
                        totalSpotifyRevenue: { $sum: '$revenue.spotify' },
                    }
                }
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

router.get('/generate-report', async (req, res) => {
    try {
        const { type, email } = req.query; // 'album' or 'single'

        if (!type || !email) {
            return res.status(400).json({ message: 'Type and email are required' });
        }

        let reportData;

        if (type === 'album') {
            reportData = await AlbumAnalytics.aggregate([
                { $match: { email: email } },
                {
                    $group: {
                        _id: null,
                        totalAlbumSold: { $sum: '$album_sold' },
                        totalStreamApple: { $sum: '$stream.apple' },
                        totalStreamSpotify: { $sum: '$stream.spotify' },
                        totalRevenueApple: { $sum: '$revenue.apple' },
                        totalRevenueSpotify: { $sum: '$revenue.spotify' }
                    }
                }
            ]);
        } else if (type === 'single') {
            reportData = await SingleAnalytics.aggregate([
                { $match: { email: email } },
                {
                    $group: {
                        _id: null,
                        totalSingleSold: { $sum: '$single_sold' },
                        totalStreamApple: { $sum: '$stream.apple' },
                        totalStreamSpotify: { $sum: '$stream.spotify' },
                        totalRevenueApple: { $sum: '$revenue.apple' },
                        totalRevenueSpotify: { $sum: '$revenue.spotify' }
                    }
                }
            ]);
        } else {
            return res.status(400).json({ message: 'Invalid type' });
        }

        const data = reportData[0] || {
            totalAlbumSold: 0,
            totalSingleSold: 0,
            totalStreamApple: 0,
            totalStreamSpotify: 0,
            totalRevenueApple: 0,
            totalRevenueSpotify: 0,
        };

        const response = {
            ...(type === 'album' ? {
                album_sold: data.totalAlbumSold,
                stream: {
                    apple: data.totalStreamApple,
                    spotify: data.totalStreamSpotify,
                },
                revenue: {
                    apple: data.totalRevenueApple,
                    spotify: data.totalRevenueSpotify,
                }
            } : {
                single_sold: data.totalSingleSold,
                stream: {
                    apple: data.totalStreamApple,
                    spotify: data.totalStreamSpotify,
                },
                revenue: {
                    apple: data.totalRevenueApple,
                    spotify: data.totalRevenueSpotify,
                }
            })
        };

        res.json(response);
    } catch (error) {
        res.status(500).json({ message: 'Error generating report', error: error.message });
    }
});

router.post('/single-analytics', async (req, res) => {
    try {
        const singleAnalytics = new SingleAnalytics(req.body);
        await singleAnalytics.save();
        res.status(201).json({ message: 'Single Analytics created successfully!', data: singleAnalytics });
    } catch (error) {
        res.status(400).json({ message: 'Failed to create Single Analytics.', error: error.message });
    }
});

// Get Single Analytics by Email and ID
router.get('/single-analytics/:email/:id', async (req, res) => {
    try {
        const { email, id } = req.params;
        const singleAnalytics = await SingleAnalytics.findOne({ email, _id: id });
        if (!singleAnalytics) {
            return res.status(404).json({ message: 'Single Analytics not found.' });
        }
        res.json(singleAnalytics);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving Single Analytics.', error: error.message });
    }
});

// Update Single Analytics by Email and ID
router.put('/single-analytics/:email/:id', async (req, res) => {
    try {
        const { email, id } = req.params;
        const updatedAnalytics = await SingleAnalytics.findOneAndUpdate(
            { email, _id: id },
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedAnalytics) {
            return res.status(404).json({ message: 'Single Analytics not found.' });
        }
        res.json({ message: 'Single Analytics updated successfully!', data: updatedAnalytics });
    } catch (error) {
        res.status(400).json({ message: 'Failed to update Single Analytics.', error: error.message });
    }
});

// Delete Single Analytics by Email and ID
router.delete('/single-analytics/:email/:id', async (req, res) => {
    try {
        const { email, id } = req.params;
        const deletedAnalytics = await SingleAnalytics.findOneAndDelete({ email, _id: id });
        if (!deletedAnalytics) {
            return res.status(404).json({ message: 'Single Analytics not found.' });
        }
        res.json({ message: 'Single Analytics deleted successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting Single Analytics.', error: error.message });
    }
});

router.get('/monthlyReport/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        // Get Album Analytics for the user
        const albumData = await AlbumAnalytics.find({ email });
        // Get Single Analytics for the user
        const singleData = await SingleAnalytics.find({ email });

        // Format the sales period
        const salesPeriod = moment().format('MMM YYYY');

        // Calculate totals
        let albumSold = 0;
        let singleSold = 0;
        let totalStreamsApple = 0;
        let totalStreamsSpotify = 0;
        let totalRevenue = 0;

        // Process Album Data
        albumData.forEach(album => {
            albumSold += album.album_sold;
            totalStreamsApple += album.stream.apple;
            totalStreamsSpotify += album.stream.spotify;
            totalRevenue += (album.revenue.apple + album.revenue.spotify);
        });

        // Process Single Data
        singleData.forEach(single => {
            singleSold += single.single_sold;
            totalStreamsApple += single.stream.apple;
            totalStreamsSpotify += single.stream.spotify;
            totalRevenue += (single.revenue.apple + single.revenue.spotify);
        });

        // Calculate the combined total streams for Apple and Spotify
        const totalCombinedStreams = totalStreamsApple + totalStreamsSpotify;

        // Prepare the report
        const report = {
            sales_period: salesPeriod,
            album_sold: albumSold,
            single_sold: singleSold,
            streams: {
                apple: totalStreamsApple,
                spotify: totalStreamsSpotify,
                total_combined: totalCombinedStreams // Combined total streams
            },
            total_revenue: totalRevenue
        };

        res.json(report);
    } catch (error) {
        res.status(500).json({ message: 'Error generating report.', error: error.message });
    }
});

module.exports = router;
