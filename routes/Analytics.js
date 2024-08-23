const express = require('express');
const router = express.Router();
require('dotenv').config();
const fetch = require('node-fetch');
const SpotifyAnalytics = require('../models/SpotifyAnalytics');
const Analytics = require('../models/Analytics');

async function getSpotifyToken() {
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
    });
    if (!response.ok) {
        throw new Error('Failed to retrieve Spotify access token');
    }
    const data = await response.json();
    return data.access_token;
}

// Endpoint to get artist data and save it to MongoDB
router.get('/artist/:artistId', async (req, res) => {
    try {
        const { artistId } = req.params;
        const { email } = req.query;  // Get email from query parameters

        if (!email) {
            return res.status(400).json({ error: 'Email query parameter is required' });
        }

        const token = await getSpotifyToken();

        // Fetch artist's top tracks
        const artistResponse = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!artistResponse.ok) {
            throw new Error('Failed to fetch artist data from Spotify');
        }

        const artistData = await artistResponse.json();

        if (!artistData.tracks || artistData.tracks.length === 0) {
            return res.status(404).json({ error: 'No tracks found for this artist' });
        }

        // Extract and prepare data for each track
        const analyticsData = artistData.tracks.map(track => ({
            email: email,
            artist_id: artistId,
            song_name: track.name || 'N/A',
            release_date: track.album ? track.album.release_date : 'N/A',
            type: track.album ? track.album.album_type : 'N/A',
            artist_name: track.artists ? track.artists.map(artist => artist.name).join(', ') : 'N/A',
            revenue: 'N/A',        // Placeholder
            streams: 0,            // Placeholder
            stream_time: 0         // Placeholder
        }));

        // Save to MongoDB
        await SpotifyAnalytics.insertMany(analyticsData);

        res.json(analyticsData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch and save artist data' });
    }
});

// 1. Endpoint to display all data for a particular user and artist
router.get('/artist/data', async (req, res) => {
    try {
        const { email, artistId } = req.query;

        if (!email || !artistId) {
            return res.status(400).json({ error: 'Email and artistId query parameters are required' });
        }

        const data = await SpotifyAnalytics.find({ email: email, artist_id: artistId });

        if (data.length === 0) {
            return res.status(404).json({ error: 'No data found for the specified user and artist' });
        }

        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve data' });
    }
});

// 2. Endpoint to calculate total revenue, total streams, and total stream time for a particular user and artist
router.get('/artist/totals', async (req, res) => {
    try {
        const { email, artistId } = req.query;

        if (!email || !artistId) {
            return res.status(400).json({ error: 'Email and artistId query parameters are required' });
        }

        const totals = await SpotifyAnalytics.aggregate([
            { $match: { email: email, artist_id: artistId } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: { $toDouble: "$revenue" } }, 
                    totalStreams: { $sum: "$streams" },
                    totalStreamTime: { $sum: "$stream_time" }
                }
            }
        ]);

        if (totals.length === 0) {
            return res.status(404).json({ error: 'No data found for the specified user and artist' });
        }

        res.json(totals[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to calculate totals' });
    }
});

// 3. Endpoint to collate the total number of streams per month
router.get('/artist/streamsPerMonth', async (req, res) => {
    try {
        const { email, artistId } = req.query;

        if (!email || !artistId) {
            return res.status(400).json({ error: 'Email and artistId query parameters are required' });
        }

        const streamsPerMonth = await SpotifyAnalytics.aggregate([
            { $match: { email: email, artist_id: artistId } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, // Group by month
                    totalStreams: { $sum: "$streams" }
                }
            },
            { $sort: { "_id": 1 } } // Sort by month in ascending order
        ]);

        if (streamsPerMonth.length === 0) {
            return res.status(404).json({ error: 'No data found for the specified user and artist' });
        }

        res.json(streamsPerMonth);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve streams per month' });
    }
});

// 1. Endpoint to display all data for a particular user
router.get('/analytics/data', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ error: 'Email query parameter is required' });
        }

        const data = await Analytics.find({ email });

        if (data.length === 0) {
            return res.status(404).json({ error: 'No data found for the specified user' });
        }

        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve data' });
    }
});

// 2. Endpoint to calculate total revenue, total streams, and total stream time for a particular user
router.get('/analytics/totals', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ error: 'Email query parameter is required' });
        }

        const totals = await Analytics.aggregate([
            { $match: { email } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$revenue" },
                    totalStreams: { $sum: "$streams" },
                    totalStreamTime: { $sum: "$stream_time" }
                }
            }
        ]);

        if (totals.length === 0) {
            return res.status(404).json({ error: 'No data found for the specified user' });
        }

        res.json(totals[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to calculate totals' });
    }
});

// 3. Endpoint to collate total number of streams per month
router.get('/analytics/streamsPerMonth', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ error: 'Email query parameter is required' });
        }

        const streamsPerMonth = await Analytics.aggregate([
            { $match: { email } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, // Group by month
                    totalStreams: { $sum: "$streams" }
                }
            },
            { $sort: { "_id": 1 } } // Sort by month in ascending order
        ]);

        if (streamsPerMonth.length === 0) {
            return res.status(404).json({ error: 'No data found for the specified user' });
        }

        res.json(streamsPerMonth);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to retrieve streams per month' });
    }
});

router.post('/analytics/save', async (req, res) => {
    try {
        const { email, artist_id, song_name, release_date, type, artist_name, revenue, streams, stream_time } = req.body;

        if (!email || !artist_id || !song_name || !release_date || !type || !artist_name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const newAnalytics = new Analytics({
            email,
            artist_id,
            song_name,
            release_date,
            type,
            artist_name,
            revenue: revenue || 0,
            streams: streams || 0,
            stream_time: stream_time || 0,
        });

        const savedAnalytics = await newAnalytics.save();
        res.status(201).json(savedAnalytics);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save analytics data' });
    }
});

// Update analytics data for a specific entry
router.put('/analytics/update', async (req, res) => {
    try {
        const { id, email, artist_id, song_name, release_date, type, artist_name, revenue, streams, stream_time } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'ID of the analytics data is required' });
        }

        const updatedData = {};

        // Only update fields that are provided
        if (email) updatedData.email = email;
        if (artist_id) updatedData.artist_id = artist_id;
        if (song_name) updatedData.song_name = song_name;
        if (release_date) updatedData.release_date = release_date;
        if (type) updatedData.type = type;
        if (artist_name) updatedData.artist_name = artist_name;
        if (revenue !== undefined) updatedData.revenue = revenue;
        if (streams !== undefined) updatedData.streams = streams;
        if (stream_time !== undefined) updatedData.stream_time = stream_time;

        const updatedAnalytics = await Analytics.findByIdAndUpdate(id, updatedData, { new: true });

        if (!updatedAnalytics) {
            return res.status(404).json({ error: 'Analytics data not found' });
        }

        res.json(updatedAnalytics);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update analytics data' });
    }
});


// Delete analytics data for a specific entry
router.delete('/analytics/delete', async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'ID of the analytics data is required' });
        }

        const deletedAnalytics = await Analytics.findByIdAndDelete(id);

        if (!deletedAnalytics) {
            return res.status(404).json({ error: 'Analytics data not found' });
        }

        res.json({ message: 'Analytics data deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete analytics data' });
    }
});


module.exports = router;
