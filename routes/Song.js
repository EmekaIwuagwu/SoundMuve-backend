const express = require('express');
const router = express.Router();
const Album = require('../models/Album');
const Song = require('../models/Song');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
  });

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'songs',
        resource_type: 'auto', // This will allow any file type
        format: async (req, file) => 'mp3', // Force format to mp3
    },
});

const parser = multer({ storage: storage });

const jpegstorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'album_covers',
        allowedFormats: ['jpg', 'jpeg', 'png'],
    },
});

const Imgparser = multer({ storage: jpegstorage });

// Endpoint to upload songs to Cloudinary and save song details in MongoDB
router.put('/upload-songs', parser.array('song_mp3', 10), async (req, res) => {
    try {
        const { email, song_title, song_writer, creative_role, copyright_ownership, copyright_ownership_permissions, isrc_number, language_of_lyrics, lyrics, ticktokClipStartTime } = req.body;

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded.' });
        }

        // Map through the uploaded files to get the secure URLs
        const songs = req.files.map(file => ({
            email,
            song_mp3: file.path, // Ensure file.path is used here
            song_title,
            song_writer: JSON.parse(song_writer), // Assuming song_writer is sent as a JSON string array
            creative_role: JSON.parse(creative_role), // Assuming creative_role is sent as a JSON string array
            copyright_ownership,
            copyright_ownership_permissions,
            isrc_number,
            language_of_lyrics,
            lyrics,
            ticktokClipStartTime,
        }));

        // Save each song to the database
        const savedSongs = await Song.insertMany(songs);

        res.status(201).json(savedSongs);
    } catch (error) {
        console.error('Error:', error); // Log detailed error
        res.status(500).json({ message: error.message });
    }
});


router.put('/albums', Imgparser.single('song_cover_url'), async (req, res) => {
    try {
        const { 
            email, album_title, artist_name, language, primary_genre, secondary_genre, release_date, release_time, 
            listenerTimeZone, otherTimeZone, label_name, soldWorldwide, recording_location, upc_ean, store, 
            social_platform, status 
        } = req.body;

        const song_cover_url = req.file ? req.file.path : null;

        const albumData = {
            email, album_title, artist_name, language, primary_genre, secondary_genre, release_date, release_time, 
            listenerTimeZone, otherTimeZone, label_name, soldWorldwide, recording_location, upc_ean, store, 
            social_platform, status, song_cover_url
        };

        const album = new Album(albumData);
        await album.save();

        res.status(201).json(album);
    } catch (error) {
        console.error('Error:', error); // Log detailed error
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;


router.get('/albums-songs-by-email/:email', async (req, res) => {
    try {
        const { email } = req.params;

        // Fetch albums with matching email
        const albums = await Album.find({ email }).lean();

        // Fetch songs with matching email
        const songs = await Song.find({ email }).lean();

        // Process each album
        const albumsWithSongs = albums.map(album => {
            const albumSongs = songs.map(song => ({
                song_mp3: song.song_mp3,
                song_title: song.song_title,
                song_writer: song.song_writer,
                creatives: song.creative_role.map((role, index) => ({
                    creative_name: song.song_writer[index], // Assuming song_writer and creative_role are parallel arrays
                    creative_role: role
                })),
                copyright_ownership: song.copyright_ownership,
                isrc_number: song.isrc_number,
                language_of_lyrics: song.language_of_lyrics,
                lyrics: song.lyrics,
                ticktokClipStartTime: song.ticktokClipStartTime
            }));

            return { ...album, songs: albumSongs };
        });

        res.json({ albums: albumsWithSongs });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
