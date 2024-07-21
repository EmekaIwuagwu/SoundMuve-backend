const express = require('express');
const router = express.Router();
const RecordLabel = require('../models/RecordLabelManager');
const Song = require('../models/Song');
require('dotenv').config();

router.post('/artists', async (req, res) => {
    if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ") ||
        !req.headers.authorization.split(" ")[1]
    ) {
        return res.status(422).json({ message: "Please Provide Token!" });
    }

    const { artistName, email, phoneNumber, country, gender, recordLabelemail } = req.body;

    if (!artistName || !email || !phoneNumber || !country || !gender || !recordLabelemail) {
        return res.status(400).send({ message: 'All fields are required' });
    }

    const artist = new ArtistForRecordLabel({
        artistName,
        email,
        phoneNumber,
        country,
        recordLabelemail,
        gender
    });

    try {
        const savedArtist = await artist.save();
        res.status(201).send({
            message: 'Artist saved successfully',
            artist: savedArtist
        });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});


router.get('/artists/songs-count', async (req, res) => {
    if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ") ||
        !req.headers.authorization.split(" ")[1]
    ) {
        return res.status(422).json({ message: "Please Provide Token!" });
    }

    const { recordLabelemail, artistName } = req.query;

    if (!recordLabelemail) {
        return res.status(400).send({ message: 'recordLabelemail query parameter is required' });
    }

    try {
        const query = { recordLabelemail };
        if (artistName) {
            query.artistName = artistName;
        }

        const artists = await RecordLabel.find(query);
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