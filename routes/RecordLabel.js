const express = require('express');
const router = express.Router();
const ArtistForRecordLabel = require('../models/artistForRecordLabel');
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

module.exports = router;
