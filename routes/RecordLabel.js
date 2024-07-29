const express = require('express');
const router = express.Router();
const ArtistForRecordLabel = require('../models/RecordLabelManager');
const Song = require('../models/Song');
require('dotenv').config();

const validateToken = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(" ")[1];
    if (!token) {
        return res.status(422).json({ message: "Please Provide Token!" });
    }
    // Token validation logic (e.g., JWT verification) can be added here.
    next();
};

router.post('/artists', validateToken, async (req, res) => {
    const { artistName, email, phoneNumber, country, gender, recordLabelemail } = req.body;

    if (!artistName || !email || !phoneNumber || !country || !gender || !recordLabelemail) {
        return res.status(400).send({ message: 'All fields are required' });
    }

    try {
        const existingArtist = await ArtistForRecordLabel.findOne({ email });
        if (existingArtist) {
            return res.status(400).send({ message: 'Artist with this email has already been saved' });
        }

        const artist = new ArtistForRecordLabel({
            artistName,
            email,
            phoneNumber,
            country,
            recordLabelemail,
            gender
        });

        const savedArtist = await artist.save();
        res.status(201).send({
            message: 'Artist saved successfully',
            artist: savedArtist
        });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

router.get('/artists/songs-count', validateToken, async (req, res) => {
    const { recordLabelemail, artistName } = req.query;

    if (!recordLabelemail) {
        return res.status(400).send({ message: 'recordLabelemail query parameter is required' });
    }

    try {
        const query = { recordLabelemail };
        if (artistName) {
            query.artistName = artistName;
        }

        const artists = await ArtistForRecordLabel.find(query);
        const results = [];

        for (const artist of artists) {
            const songsCount = await Song.countDocuments({ creative_name: artist.artistName });
            results.push({
                artistName: artist.artistName,
                email: artist.email,
                recordLabelemail: artist.recordLabelemail,
                phoneNumber: artist.phoneNumber,
                country: artist.country,
                gender: artist.gender,
                songsCount
            });
        }

        res.send(results);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});


router.get('/songs/count', validateToken, async (req, res) => {
    const { email } = req.query;

    // Check if email is provided
    if (!email) {
        return res.status(400).send({ message: 'Email query parameter is required' });
    }

    try {
        // Count the number of songs associated with the provided email
        const count = await Song.countDocuments({ email });

        // Return the count
        res.send({ count });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

router.get('/artistsList/count', async (req, res) => {
    const recordLabelemail = req.query.recordLabelemail;
    try {
        const count = await ArtistForRecordLabel.countDocuments({ recordLabelemail });
        res.status(200).json({ count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Search for artist endpoint
router.get('/artistsList/search', async (req, res) => {
    const recordLabelemail = req.query.recordLabelemail;
    const artistName = req.query.artistName;
    try {
        const artist = await ArtistForRecordLabel.findOne({ recordLabelemail, artistName });
        if (artist) {
            res.status(200).json(artist);
        } else {
            res.status(404).json({ message: 'Artist not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get list of artists endpoint
router.get('/artistsList', async (req, res) => {
    const recordLabelemail = req.query.recordLabelemail;
    try {
        const artists = await ArtistForRecordLabel.find({ recordLabelemail });
        res.status(200).json(artists);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});
module.exports = router;
