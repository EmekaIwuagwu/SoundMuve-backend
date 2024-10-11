const express = require('express');
const moment = require('moment');
const router = express.Router();
const Song = require('../models/Song');
const User = require('../models/User');
const Artist = require('../models/RecordLabelManager');
const { AlbumAnalytics, SingleAnalytics, Store, Location } = require('../models/AnalyticsSchema');
const jwt = require('jsonwebtoken');

async function findArtistByName(artistName) {
    const artist = await Artist.findOne({ artistName: artistName });
    return artist;
}

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

const parseDateRange = (startDate, endDate) => {
    const start = moment(startDate).startOf('day');
    const end = moment(endDate).endOf('day');
    return { start, end };
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

router.get('/revenueByType', async (req, res) => {
    const { type, email, artistName, year, single_name, album_name } = req.query;

    // Log the incoming query parameters
    console.log('Query Parameters:', { type, email, artistName, year, single_name, album_name });

    // Validate that all necessary query parameters are provided
    if (!type || !email || !year || 
        (type === 'single' && !single_name) || (type === 'album' && !album_name)) {
        return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Select the correct model based on the 'type' parameter
    let analyticsModel;
    let matchCriteria = { email, artistName, year: parseInt(year) };

    if (type === 'single') {
        analyticsModel = SingleAnalytics;
        matchCriteria.single_name = single_name;
    } else if (type === 'album') {
        analyticsModel = AlbumAnalytics;
        matchCriteria.album_name = album_name;
    } else {
        return res.status(400).json({ message: 'Invalid type. Must be either "album" or "single"' });
    }

    try {
        // Step 1: Check if data exists for the provided parameters
        const existingData = await analyticsModel.findOne(matchCriteria);
        if (!existingData) {
            return res.status(404).json({ message: 'No data found for the provided parameters' });
        }

        // Step 2: Perform the aggregation pipeline to get monthly data for the specified year
        const results = await analyticsModel.aggregate([
            {
                $match: {
                    ...matchCriteria
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$created_at" },
                        month: { $month: "$created_at" }
                    },
                    totalRevenue: { $sum: { $add: ["$revenue.apple", "$revenue.spotify"] } },
                    totalAppleRevenue: { $sum: "$revenue.apple" },
                    totalSpotifyRevenue: { $sum: "$revenue.spotify" },
                    totalAppleStreams: { $sum: "$stream.apple" },
                    totalSpotifyStreams: { $sum: "$stream.spotify" },
                    totalAppleStreamTime: { $sum: "$streamTime.apple" },
                    totalSpotifyStreamTime: { $sum: "$streamTime.spotify" }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1 }
            }
        ]);

        // Step 3: Initialize an array for the 12 months with zero values
        const monthlyData = Array.from({ length: 12 }, (_, index) => ({
            month: new Date(0, index).toLocaleString('default', { month: 'short' }),
            totalRevenue: 0,
            totalAppleRevenue: 0,
            totalSpotifyRevenue: 0,
            totalAppleStreams: 0,
            totalSpotifyStreams: 0,
            totalAppleStreamTime: 0,
            totalSpotifyStreamTime: 0,
            percentageRevenueFromApple: "0.00"
        }));

        // Step 4: Populate the monthly data with results from the aggregation
        results.forEach(({ _id, totalRevenue, totalAppleRevenue, totalSpotifyRevenue, totalAppleStreams, totalSpotifyStreams, totalAppleStreamTime, totalSpotifyStreamTime }) => {
            const monthIndex = _id.month - 1; // Convert month (1-12) to index (0-11)
            monthlyData[monthIndex] = {
                month: monthlyData[monthIndex].month,
                totalRevenue: totalRevenue.toFixed(2),
                totalAppleRevenue: totalAppleRevenue.toFixed(2),
                totalSpotifyRevenue: totalSpotifyRevenue.toFixed(2),
                totalAppleStreams: totalAppleStreams,
                totalSpotifyStreams: totalSpotifyStreams,
                totalAppleStreamTime: totalAppleStreamTime,
                totalSpotifyStreamTime: totalSpotifyStreamTime,
                percentageRevenueFromApple: totalRevenue > 0 ? ((totalAppleRevenue / totalRevenue) * 100).toFixed(2) : "0.00"
            };
        });

        // Step 5: Return the final data
        res.json(monthlyData);

    } catch (error) {
        console.error('Error fetching records:', error);
        res.status(500).json({ message: 'Internal server error' });
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
                    singles_id: Id.trim()  // Match against singles_id
                }
            }
        ]);

        console.log(`Aggregation results: ${JSON.stringify(results)}`); // Log aggregation results

        const response = results[0] || {
            revenue: {
                apple: 0,
                spotify: 0
            },
            stream: {
                apple: 0,
                spotify: 0
            },
            streamTime: {
                apple: 0,
                spotify: 0
            }
        };

        res.json({
            analytics: {
                apple: {
                    revenue: response.revenue.apple,  // Correctly reference revenue for apple
                    streams: response.stream.apple,   // Correctly reference streams for apple
                    streamTime: response.streamTime.apple // Correctly reference streamTime for apple
                },
                spotify: {
                    revenue: response.revenue.spotify,  // Correctly reference revenue for spotify
                    streams: response.stream.spotify,   // Correctly reference streams for spotify
                    streamTime: response.streamTime.spotify // Correctly reference streamTime for spotify
                },
                song: {
                    id: Id,
                    title: song.song_title,
                    albumId: song.album_id, // Ensure this property exists on the song object
                },
                user: {
                    email: user.email,
                    balance: user.balance,
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
              _id: '$album_name', // Group by album name
              album_sold: { $sum: '$album_sold' },
              totalStreamApple: { $sum: '$stream.apple' },
              totalStreamSpotify: { $sum: '$stream.spotify' },
              totalRevenueApple: { $sum: '$revenue.apple' },
              totalRevenueSpotify: { $sum: '$revenue.spotify' },
            }
          }
        ]);
  
        // Format the report response for albums
        const data = reportData.map(item => ({
          album_name: item._id,
          album_sold: item.album_sold,
          streams: item.totalStreamApple + item.totalStreamSpotify, // Combined streams
          total_revenue: item.totalRevenueApple + item.totalRevenueSpotify // Combined revenue
        }));
        return res.json(data);
  
      } else if (type === 'single') {
        reportData = await SingleAnalytics.aggregate([
          { $match: { email: email } },
          {
            $group: {
              _id: '$single_name', // Group by single name
              single_sold: { $sum: '$single_sold' },
              totalStreamApple: { $sum: '$stream.apple' },
              totalStreamSpotify: { $sum: '$stream.spotify' },
              totalRevenueApple: { $sum: '$revenue.apple' },
              totalRevenueSpotify: { $sum: '$revenue.spotify' },
            }
          }
        ]);
  
        // Format the report response for singles
        const data = reportData.map(item => ({
          title: item._id,
          songs_sold: item.single_sold,
          streams: item.totalStreamApple + item.totalStreamSpotify, // Combined streams
          total_revenue: item.totalRevenueApple + item.totalRevenueSpotify // Combined revenue
        }));
        return res.json(data);
  
      } else {
        return res.status(400).json({ message: 'Invalid type' });
      }
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

        // Initialize an array to hold the reports for each month
        const monthlyReports = [];

        // Loop through each month of the year (0 = January, 11 = December)
        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
            const startOfMonth = moment().startOf('year').add(monthIndex, 'months').toDate(); // Start of the month
            const endOfMonth = moment(startOfMonth).endOf('month').toDate(); // End of the month

            // Get Album Analytics for the user for the specific month
            const albumData = await AlbumAnalytics.find({
                email,
                created_at: { $gte: startOfMonth, $lte: endOfMonth }
            });

            // Get Single Analytics for the user for the specific month
            const singleData = await SingleAnalytics.find({
                email,
                created_at: { $gte: startOfMonth, $lte: endOfMonth }
            });

            // Initialize totals for the month
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

            // Prepare the monthly report
            monthlyReports.push({
                month: moment(startOfMonth).format('MMM YYYY'),
                album_sold: albumSold,
                single_sold: singleSold,
                streams: {
                    apple: totalStreamsApple,
                    spotify: totalStreamsSpotify,
                    total_combined: totalCombinedStreams // Combined total streams
                },
                total_revenue: totalRevenue
            });
        }

        res.json(monthlyReports);
    } catch (error) {
        res.status(500).json({ message: 'Error generating report.', error: error.message });
    }
});

router.get('/userReport/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const { startDate, endDate } = req.query;

        // Ensure startDate and endDate are provided
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required.' });
        }

        // Parse date range
        const { start, end } = parseDateRange(startDate, endDate);

        // Fetch album analytics in the provided date range
        const albumData = await AlbumAnalytics.find({
            email,
            created_at: { $gte: start.toDate(), $lte: end.toDate() }
        });

        // Fetch single analytics in the provided date range
        const singleData = await SingleAnalytics.find({
            email,
            created_at: { $gte: start.toDate(), $lte: end.toDate() }
        });

        // Initialize totals
        let totalStreamsApple = 0;
        let totalStreamsSpotify = 0;
        let totalRevenue = 0;

        // Arrays for album and single names
        let albumNames = [];
        let singleNames = [];

        // Process album data
        albumData.forEach(album => {
            albumNames.push(album.album_name);
            totalStreamsApple += album.stream.apple;
            totalStreamsSpotify += album.stream.spotify;
            totalRevenue += album.revenue.apple + album.revenue.spotify;
        });

        // Process single data
        singleData.forEach(single => {
            singleNames.push(single.single_name);
            totalStreamsApple += single.stream.apple;
            totalStreamsSpotify += single.stream.spotify;
            totalRevenue += single.revenue.apple + single.revenue.spotify;
        });

        // Prepare report
        const report = {
            date_range: {
                start: startDate,
                end: endDate
            },
            albums: albumNames,
            singles: singleNames,
            total_streams: {
                apple: totalStreamsApple,
                spotify: totalStreamsSpotify,
                combined: totalStreamsApple + totalStreamsSpotify
            },
            total_earnings: totalRevenue
        };

        // Return report
        res.json(report);
    } catch (error) {
        res.status(500).json({ message: 'Error generating report.', error: error.message });
    }
});

// Endpoint 1: Monthly revenue analytics by artist name
router.get('/analytics/artist-revenue-monthly', async (req, res) => {
    try {
        const { type, year, artistName, song_title } = req.query;
        
        // Validate required parameters
        if (!year) return res.status(400).json({ message: 'Year is required' });
        if (!artistName) return res.status(400).json({ message: 'Artist name is required' });
        if (!song_title) return res.status(400).json({ message: 'Song title is required' });

        let model;
        if (type === 'album') {
            model = AlbumAnalytics;
        } else if (type === 'single') {
            model = SingleAnalytics;
        } else {
            return res.status(400).json({ message: 'Invalid type' });
        }

        // Find artist by name
        const artist = await findArtistByName(artistName);
        if (!artist) return res.status(404).json({ message: 'Artist not found' });

        const monthlyData = [];

        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
            const startOfMonth = new Date(year, monthIndex, 1);
            const endOfMonth = new Date(year, monthIndex + 1, 0);
            startOfMonth.setHours(0, 0, 0, 0);
            endOfMonth.setHours(23, 59, 59, 999);

            const results = await model.aggregate([
                {
                    $match: {
                        created_at: { $gte: startOfMonth, $lte: endOfMonth },
                        artist_name: artist.artistName,  // Use artist's name
                        [type === 'album' ? 'album_name' : 'single_name']: song_title.trim()
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

            const totalData = results[0] || { totalAppleRevenue: 0, totalSpotifyRevenue: 0 };
            const totalRevenue = totalData.totalAppleRevenue + totalData.totalSpotifyRevenue;
            const percentageValue = totalRevenue ? (totalData.totalAppleRevenue / totalRevenue) * 100 : 0;

            const monthName = startOfMonth.toLocaleString('default', { month: 'short' });
            monthlyData.push({
                percentageValue: percentageValue.toFixed(2),
                month: monthName,
                totalRevenue: totalRevenue.toFixed(2),
                totalAppleRevenue: totalData.totalAppleRevenue.toFixed(2),
                totalSpotifyRevenue: totalData.totalSpotifyRevenue.toFixed(2),
            });
        }

        res.json(monthlyData);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message });
    }
});

// Endpoint 2: Get yearly revenue analytics by artist name
router.get('/analytics/artist-revenue-yearly', async (req, res) => {
    try {
        const { type, Id, artistName } = req.query;
        const currentDate = new Date();
        const startOfYear = new Date(currentDate.getFullYear(), 0, 1); // Start of the current year

        let model;
        if (type === 'album') model = AlbumAnalytics;
        else if (type === 'single') model = SingleAnalytics;
        else return res.status(400).json({ message: 'Invalid type' });

        // Find artist by name
        const artist = await findArtistByName(artistName);
        if (!artist) return res.status(404).json({ message: 'Artist not found' });

        const results = await model.aggregate([
            {
                $match: {
                    created_at: { $gte: startOfYear },
                    singles_id: Id.trim()
                }
            }
        ]);

        const response = results[0] || {
            revenue: { apple: 0, spotify: 0 },
            stream: { apple: 0, spotify: 0 },
            streamTime: { apple: 0, spotify: 0 }
        };

        res.json({
            analytics: {
                apple: {
                    revenue: response.revenue.apple,
                    streams: response.stream.apple,
                    streamTime: response.streamTime.apple
                },
                spotify: {
                    revenue: response.revenue.spotify,
                    streams: response.stream.spotify,
                    streamTime: response.streamTime.spotify
                },
                song: {
                    id: Id,
                    title: 'Unknown',
                    albumId: 'Unknown'
                },
                artist: {
                    name: artist.artistName,
                    balance: 0 // Add balance handling if required
                }
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

// Endpoint 3: Get locations by artist name
router.get('/locations/artistLocation/:artistName', async (req, res) => {
    try {
        const { artistName } = req.params;

        // Find artist by name
        const artist = await findArtistByName(artistName);
        if (!artist) return res.status(404).send({ message: 'Artist not found' });

        const locations = await Location.find({ artist_name: artist.artistName });

        if (locations.length === 0) {
            return res.status(404).send({ message: 'No locations found for this artist' });
        }

        res.status(200).send(locations);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

// Endpoint 4: Generate report by artist name
router.get('/artist-generate-report', async (req, res) => {
    try {
        const { type, artistName } = req.query;
        
        if (!type || !artistName) {
            return res.status(400).json({ message: 'Type and artist name are required' });
        }

        let reportData;

        // Find artist by name
        const artist = await findArtistByName(artistName);
        if (!artist) return res.status(404).json({ message: 'Artist not found' });

        if (type === 'album') {
            reportData = await AlbumAnalytics.aggregate([
                { $match: { artist_name: artist.artistName } },
                {
                    $group: {
                        _id: '$album_name',
                        album_sold: { $sum: '$album_sold' },
                        totalStreamApple: { $sum: '$stream.apple' },
                        totalStreamSpotify: { $sum: '$stream.spotify' },
                        totalRevenueApple: { $sum: '$revenue.apple' },
                        totalRevenueSpotify: { $sum: '$revenue.spotify' }
                    }
                }
            ]);

            const data = reportData.map(item => ({
                album_name: item._id,
                album_sold: item.album_sold,
                streams: item.totalStreamApple + item.totalStreamSpotify,
                total_revenue: item.totalRevenueApple + item.totalRevenueSpotify
            }));
            return res.json(data);
        } else if (type === 'single') {
            reportData = await SingleAnalytics.aggregate([
                { $match: { artist_name: artist.artistName } },
                {
                    $group: {
                        _id: '$single_name',
                        single_sold: { $sum: '$single_sold' },
                        totalStreamApple: { $sum: '$stream.apple' },
                        totalStreamSpotify: { $sum: '$stream.spotify' },
                        totalRevenueApple: { $sum: '$revenue.apple' },
                        totalRevenueSpotify: { $sum: '$revenue.spotify' }
                    }
                }
            ]);

            const data = reportData.map(item => ({
                title: item._id,
                songs_sold: item.single_sold,
                streams: item.totalStreamApple + item.totalStreamSpotify,
                total_revenue: item.totalRevenueApple + item.totalRevenueSpotify
            }));
            return res.json(data);
        } else {
            return res.status(400).json({ message: 'Invalid type' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error generating report', error: error.message });
    }
});

// Endpoint 5: Monthly report by artist name
router.get('/artistmonthlyReport/:artistName', async (req, res) => {
    try {
        const { artistName } = req.params;

        // Find artist by name
        const artist = await findArtistByName(artistName);
        if (!artist) return res.status(404).json({ message: 'Artist not found' });

        const data = await AlbumAnalytics.aggregate([
            { $match: { artist_name: artist.artistName } },
            {
                $group: {
                    _id: { $month: '$created_at' },
                    totalAlbumSold: { $sum: '$album_sold' },
                    totalRevenue: { $sum: { $add: ['$revenue.apple', '$revenue.spotify'] } },
                }
            },
            { $sort: { _id: 1 } }
        ]);

        res.json(data);
    } catch (error) {
        res.status(500).json({ message: 'Error generating monthly report', error: error.message });
    }
});

module.exports = router;
