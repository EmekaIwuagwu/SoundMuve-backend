const express = require('express');
const router = express.Router();
const ArtistForRecordLabel = require('../models/RecordLabelManager');
const Song = require('../models/Song');
require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');


const storage = multer.diskStorage({
    filename: function (req, file, cb) {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
  
  const upload = multer({ storage: storage });

const validateToken = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(" ")[1];
    if (!token) {
        return res.status(422).json({ message: "Please Provide Token!" });
    }
    // Token validation logic (e.g., JWT verification) can be added here.
    next();
};

// Add a new artist
router.post('/artists', validateToken, upload.single('artistAvatar'), async (req, res) => {
    const { artistName, email, phoneNumber, country, gender, recordLabelemail } = req.body;
  
    if (!artistName || !email || !phoneNumber || !country || !gender || !recordLabelemail) {
      return res.status(400).send({ message: 'All fields are required' });
    }
  
    if (!req.file) {
      return res.status(400).send({ message: 'Artist avatar is required' });
    }
  
    try {
      const existingArtist = await ArtistForRecordLabel.findOne({ email });
      if (existingArtist) {
        return res.status(400).send({ message: 'Artist with this email has already been saved' });
      }
  
      const result = await cloudinary.uploader.upload(req.file.path);
  
      const artist = new ArtistForRecordLabel({
        artistName,
        email,
        phoneNumber,
        country,
        recordLabelemail,
        gender,
        artistAvatarUrl: result.secure_url
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

// Get count of songs for each artist under a record label
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
            const songsCount = await Song.countDocuments({ email: artist.email });
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

// Get count of songs for a specific email
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

// Get count of artists under a record label
router.get('/artistsList/count', validateToken, async (req, res) => {
    const recordLabelemail = req.query.recordLabelemail;
    
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
        return res.status(400).send({ message: 'recordLabelemail and artistName query parameters are required' });
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

// Get list of artists under a record label
router.get('/artistsList', validateToken, async (req, res) => {
    const recordLabelemail = req.query.recordLabelemail;

    if (!recordLabelemail) {
        return res.status(400).send({ message: 'recordLabelemail query parameter is required' });
    }

    try {
        // Fetch artists for the given record label
        const artists = await ArtistForRecordLabel.find({ recordLabelemail });

        // If no artists are found, return an empty array
        if (!artists || artists.length === 0) {
            return res.status(200).json({ artists: [], totalSongs: 0 });
        }

        let totalSongsByLabel = 0;

        // Iterate over each artist and count the number of songs they have released
        const artistsWithDetails = await Promise.all(
            artists.map(async (artist) => {
                const songCount = await Song.countDocuments({ email: artist.email });
                totalSongsByLabel += songCount;

                return {
                    artistName: artist.artistName,
                    email: artist.email,
                    phoneNumber: artist.phoneNumber,
                    country: artist.country,
                    gender: artist.gender,
                    artistAvatarUrl: artist.artistAvatarUrl,
                    songCount: songCount,
                };
            })
        );

        // Respond with the list of artists, their details, and the total song count
        res.status(200).json({
            artists: artistsWithDetails,
            totalSongs: totalSongsByLabel,
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
});

router.get('/artistsListinRL', validateToken, async (req, res) => {
    const recordLabelemail = req.query.recordLabelemail;

    if (!recordLabelemail) {
        return res.status(400).send({ message: 'recordLabelemail query parameter is required' });
    }

    try {
        const artists = await ArtistForRecordLabel.find({ recordLabelemail });

        if (!artists || artists.length === 0) {
            return res.status(200).json({ artists: [], totalSongs: 0 });
        }

        let totalSongsByLabel = 0;

        const artistsWithDetails = await Promise.all(
            artists.map(async (artist) => {
                const songCount = await Song.countDocuments({ email: artist.email });
                totalSongsByLabel += songCount;

                return {
                    artistName: artist.artistName,
                    email: artist.email,
                    phoneNumber: artist.phoneNumber,
                    country: artist.country,
                    gender: artist.gender,
                    artistAvatarUrl: artist.artistAvatarUrl,
                    songCount: songCount,
                };
            })
        );

        res.status(200).json({
            artists: artistsWithDetails,
            totalSongs: totalSongsByLabel,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;
