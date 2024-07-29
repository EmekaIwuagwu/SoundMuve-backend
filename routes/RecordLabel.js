const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ArtistForRecordLabel = require('../models/RecordLabelManager');
const Song = require('../models/Song');
require('dotenv').config();

// Middleware to validate the token
const validateToken = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(" ")[1];
    if (!token) {
        return res.status(422).json({ message: "Please Provide Token!" });
    }
    // Token validation logic (e.g., JWT verification) can be added here.
    next();
};

// Create a new artist
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

// Get the number of songs for artists under a specific record label
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

// Get the count of songs for a specific artist by email
router.get('/songs/count', validateToken, async (req, res) => {
    const { email } = req.query;

    if (!email) {
        return res.status(400).send({ message: 'Email query parameter is required' });
    }

    try {
        const count = await Song.countDocuments({ email });
        res.send({ count });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

// Get the count of artists under a specific record label
router.get('/artistsList/count', validateToken, async (req, res) => {
    const { recordLabelemail } = req.query;

    if (!recordLabelemail) {
        return res.status(400).send({ message: 'recordLabelemail query parameter is required' });
    }

    try {
        const count = await ArtistForRecordLabel.countDocuments({ recordLabelemail });
        res.status(200).json({ count });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Search for an artist by record label email and artist name
router.get('/artistsList/search', validateToken, async (req, res) => {
    const { recordLabelemail, artistName } = req.query;

    if (!recordLabelemail || !artistName) {
        return res.status(400).json({ message: 'recordLabelemail and artistName query parameters are required' });
    }

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

// Get a list of artists under a specific record label
router.get('/artistsList', validateToken, async (req, res) => {
    const { recordLabelemail } = req.query;

    if (!recordLabelemail) {
        return res.status(400).send({ message: 'recordLabelemail query parameter is required' });
    }

    try {
        const artists = await ArtistForRecordLabel.find({ recordLabelemail });
        res.status(200).json(artists);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
