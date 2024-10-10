const express = require('express');
const router = express.Router();
const AlbumAnalytics = require('../models/AnalyticsSchema');
const SingleAnalytics = require('../models/AnalyticsSchema');
const ArtistForRecordLabel = require('../models/RecordLabelManager');
const Song = require('../models/Song');

// Utility function to get data based on a range of months
const getAnalyticsData = async (email, startDate, endDate) => {
    const albumData = await AlbumAnalytics.aggregate([
        {
            $match: {
                email,
                created_at: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                }
            }
        },
        {
            $group: {
                _id: null,
                totalAlbums: { $sum: 1 },
                totalStreams: { $sum: { $add: ["$stream.apple", "$stream.spotify"] } },
                totalRevenue: { $sum: { $add: ["$revenue.apple", "$revenue.spotify"] } }
            }
        }
    ]);

    const singleData = await SingleAnalytics.aggregate([
        {
            $match: {
                email,
                created_at: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                }
            }
        },
        {
            $group: {
                _id: null,
                totalSingles: { $sum: 1 },
                totalStreams: { $sum: { $add: ["$stream.apple", "$stream.spotify"] } },
                totalRevenue: { $sum: { $add: ["$revenue.apple", "$revenue.spotify"] } }
            }
        }
    ]);

    return {
        totalAlbums: albumData[0]?.totalAlbums || 0,
        totalSingles: singleData[0]?.totalSingles || 0,
        totalStreams: (albumData[0]?.totalStreams || 0) + (singleData[0]?.totalStreams || 0),
        totalRevenue: (albumData[0]?.totalRevenue || 0) + (singleData[0]?.totalRevenue || 0),
    };
};

// Endpoint 1: Get analytics data for Artist by email
router.get('/artist-analytics', async (req, res) => {
    const { email, startDate, endDate } = req.query;

    if (!email || !startDate || !endDate) {
        return res.status(400).json({ message: 'Email, startDate, and endDate are required.' });
    }

    try {
        const data = await getAnalyticsData(email, startDate, endDate);
        res.status(200).json({
            message: 'Artist analytics fetched successfully',
            data,
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching analytics', error: err.message });
    }
});

// Endpoint 2: Get analytics data for Record Label by artistName
router.get('/label-artist-analytics', async (req, res) => {
    const { artistName, recordLabelEmail, startDate, endDate } = req.query;

    if (!artistName || !recordLabelEmail || !startDate || !endDate) {
        return res.status(400).json({ message: 'ArtistName, RecordLabelEmail, startDate, and endDate are required.' });
    }

    try {
        // Ensure the artist belongs to the record label
        const artist = await ArtistForRecordLabel.findOne({ artistName, recordLabelemail: recordLabelEmail });
        if (!artist) {
            return res.status(404).json({ message: 'Artist not found under this record label' });
        }

        const data = await getAnalyticsData(artist.email, startDate, endDate);
        res.status(200).json({
            message: 'Label artist analytics fetched successfully',
            data,
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching analytics', error: err.message });
    }
});

module.exports = router;
