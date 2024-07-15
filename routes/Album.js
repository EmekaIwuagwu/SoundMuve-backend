require('dotenv').config();
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const Album = require("../models/Album");

// Cloudinary configuration
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

// Multer storage configuration for mp3 files
const storageMp3 = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'uploads', // Cloudinary folder name
        format: async (req, file) => 'mp3', // Support only mp3 format
        public_id: (req, file) => Date.now() + '-' + file.originalname,
    },
});

const upload = multer({ storage: storageMp3 });

const storageImage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'albums', // Folder name in Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png'], // Allowed image formats
        resource_type: 'auto' // Automatically determine the resource type (image, video, raw, etc.)
    }
});

const parserImage = multer({ storage: storageImage });

// Middleware function to check for authorization token
function checkToken(req, res, next) {
    if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ") ||
        !req.headers.authorization.split(" ")[1]
    ) {
        return res.status(422).json({ message: "Please Provide Token!" });
    }
    next();
}

// Route to create a new album
router.post('/create-album', checkToken, async (req, res) => {
    const {
        email = null,
        album_title = null,
        artist_name = null,
        language = null,
        primary_genre = null,
        secondary_genre = null,
        release_date = null,
        release_time = null,
        listenerTimeZone = null,
        otherTimeZone = null,
        store = null,
        social_platform = null,
        song_mp3 = null,
        song_title = null,
        song_writer = null,
        song_artists = null,
        creative_role = null,
        roles = null,
        explicitLyrics = null,
        copyright_ownership = null,
        copyright_ownership_permissions = null,
        isrc_number = null,
        status = null,
        language_of_lyrics = null,
        lyrics = null,
        ticktokClipStartTime = null,
        song_url = null,
        song_cover_url = null
    } = req.body;

    const album = new Album({
        email,
        album_title,
        artist_name,
        language,
        primary_genre,
        secondary_genre,
        release_date,
        release_time,
        listenerTimeZone,
        otherTimeZone,
        store,
        social_platform,
        song_mp3,
        song_title,
        song_writer,
        song_artists,
        creative_role,
        explicitLyrics,
        roles,
        copyright_ownership,
        copyright_ownership_permissions,
        isrc_number,
        status,
        language_of_lyrics,
        lyrics,
        ticktokClipStartTime,
        song_url,
        song_cover_url
    });

    try {
        const savedAlbum = await album.save();
        res.json({ message: 'Album Saved!', savedAlbum });
    } catch (err) {
        res.status(400).send(err);
    }
});

// Route to update page 2 of an album
router.put('/update-album/:id/page2', checkToken, async (req, res) => {
    const { label_name, recording_location, upc_ean } = req.body;

    try {
        const updatedAlbum = await Album.findByIdAndUpdate(req.params.id, {
            label_name,
            recording_location,
            upc_ean,
        }, { new: true });

        res.json({ message: 'Update successful', updatedAlbum });
    } catch (err) {
        res.status(400).send(err);
    }
});

// Route to update page 3 of an album
router.put('/update-album/:id/page3', checkToken, async (req, res) => {
    const { store, social_platform } = req.body;

    try {
        const updatedAlbum = await Album.findByIdAndUpdate(req.params.id, {
            store,
            social_platform,
        }, { new: true });

        res.json({ message: 'Update successful', updatedAlbum });
    } catch (err) {
        res.status(400).send(err);
    }
});

router.put('/update-album/:id/page4', checkToken, upload.array('song_mp3', 10), async (req, res) => {
    const {
        song_title,
        song_writer,
        song_artists,
        creative_role,
        copyright_ownership,
        copyright_ownership_permissions,
        isrc_number,
        language_of_lyrics,
        lyrics,
        ticktokClipStartTime,
    } = req.body;

    try {
        // Check if files were uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No mp3 files uploaded' });
        }

        // Get the secure URLs of the uploaded files from Cloudinary
        const songMp3Urls = req.files.map(file => file.path);

        // Create new song documents
        const newSongs = songMp3Urls.map((mp3Url, index) => ({
            song_mp3: mp3Url,
            song_title: Array.isArray(song_title) ? song_title[index] : song_title,
            song_writer: Array.isArray(song_writer) ? song_writer[index] : song_writer,
            song_artists: Array.isArray(song_artists) ? song_artists[index] : song_artists,
            creative_role: Array.isArray(creative_role) ? creative_role[index] : creative_role,
            copyright_ownership: Array.isArray(copyright_ownership) ? copyright_ownership[index] : copyright_ownership,
            copyright_ownership_permissions: Array.isArray(copyright_ownership_permissions) ? copyright_ownership_permissions[index] : copyright_ownership_permissions,
            isrc_number: Array.isArray(isrc_number) ? isrc_number[index] : isrc_number,
            language_of_lyrics: Array.isArray(language_of_lyrics) ? language_of_lyrics[index] : language_of_lyrics,
            lyrics: Array.isArray(lyrics) ? lyrics[index] : lyrics,
            ticktokClipStartTime: Array.isArray(ticktokClipStartTime) ? ticktokClipStartTime[index] : ticktokClipStartTime
        }));

        // Update album document with the new songs
        const updatedAlbum = await Album.findByIdAndUpdate(
            req.params.id,
            { $push: { songs: { $each: newSongs } } },
            { new: true } // Return the updated document
        );

        // Check if album was found
        if (!updatedAlbum) {
            return res.status(404).json({ message: 'Album not found' });
        }

        // Log and send response
        console.log({ message: 'Update successful', updatedAlbum });
        res.json({ message: 'Update successful', updatedAlbum });
    } catch (err) {
        // Log and send error response
        console.error('Error in updating album:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


// Route to update page 5 of an album (upload jpg)
router.put('/update-album/:id/page5', checkToken, parserImage.single('song_cover_url'), async (req, res) => {
    const song_cover_url = req.file ? req.file.path : null;

    if (!song_cover_url) {
        return res.status(400).json({ message: 'No cover image uploaded' });
    }

    try {
        // Upload image file to Cloudinary
        const result = await cloudinary.uploader.upload(song_cover_url, { resource_type: 'auto' });

        // Update album document with Cloudinary secure_url for song_cover_url
        const updatedAlbum = await Album.findByIdAndUpdate(req.params.id, {
            song_cover_url: result.secure_url,
        }, { new: true });

        if (!updatedAlbum) {
            return res.status(404).json({ message: 'Album not found' });
        }

        res.json({ message: 'Update successful', updatedAlbum });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err });
    }
});

// Route to get albums by email
router.get('/albums', checkToken, async (req, res) => {
    const { email } = req.query;

    try {
        // If an email is provided, filter albums by that email
        const query = email ? { email } : {};
        const albums = await Album.find(query);
        res.json(albums);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err });
    }
});

router.put('/updateAlbumByEmail/:id', checkToken, async (req, res) => {
    const { email } = req.body;
    const { id } = req.params;

    // Extract the fields to be updated from the request body
    const updateData = {
        album_title: req.body.album_title,
        artist_name: req.body.artist_name,
        language: req.body.language,
        primary_genre: req.body.primary_genre,
        secondary_genre: req.body.secondary_genre,
        release_date: req.body.release_date,
        release_time: req.body.release_time,
        listenerTimeZone: req.body.listenerTimeZone,
        otherTimeZone: req.body.otherTimeZone,
        label_name: req.body.label_name,
        soldWorldwide: req.body.soldWorldwide,
        recording_location: req.body.recording_location,
        upc_ean: req.body.upc_ean,
        store: req.body.store,
        social_platform: req.body.social_platform,
        song_mp3: req.body.song_mp3,
        song_title: req.body.song_title,
        song_writer: req.body.song_writer,
        song_artists: req.body.song_artists,
        creative_role: req.body.creative_role,
        roles: req.body.roles,
        explicitLyrics : req.body.explicitLyrics,
        copyright_ownership: req.body.copyright_ownership,
        copyright_ownership_permissions: req.body.copyright_ownership_permissions,
        isrc_number: req.body.isrc_number,
        language_of_lyrics: req.body.language_of_lyrics,
        lyrics: req.body.lyrics,
        ticktokClipStartTime: req.body.ticktokClipStartTime,
        song_url: req.body.song_url,
        status: req.body.status,
        song_cover_url: req.body.song_cover_url,
    };

    try {
        const updatedAlbum = await Album.findOneAndUpdate(
            { email, _id: id },
            { $set: updateData },
            { new: true } // Return the updated document
        );

        if (!updatedAlbum) {
            return res.status(404).json({ message: 'Album not found' });
        }

        res.json({ message: 'Update successful', updatedAlbum });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err });
    }
});

router.delete('/delete-album/:id', checkToken, async (req, res) => {
    const albumId = req.params.id;
    const email = req.body.email;

    try {
        const album = await Album.findOneAndDelete({ _id: albumId, email: email });

        if (!album) {
            return res.status(404).json({ message: 'Album not found or email mismatch' });
        }

        res.json({ message: 'Album deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err });
    }
});

// Export the router
module.exports = router;
