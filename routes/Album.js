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
        folder: 'albums', // Folder name in Cloudinary
        allowed_formats: ['mp3'], // Only allow mp3 files
        resource_type: 'auto' // Automatically determine the resource type (image, video, raw, etc.)
    }
});

const storageImage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'albums', // Folder name in Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png'], // Allowed image formats
        resource_type: 'auto' // Automatically determine the resource type (image, video, raw, etc.)
    }
});

const parserMp3 = multer({ storage: storageMp3 });
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
        creattive_name = null,
        roles = null,
        copyright_ownership = null,
        copyright_ownership_permissions = null,
        isrc_number = null,
        status = null,
        language_of_lyrics = null,
        language_of_lyrics_optional = null,
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
        creattive_name,
        roles,
        copyright_ownership,
        copyright_ownership_permissions,
        isrc_number,
        status,
        language_of_lyrics,
        language_of_lyrics_optional,
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

router.put('/update-album/:id/page4', checkToken, parserMp3.single('song_mp3'), async (req, res) => {
    const {
        song_title,
        song_writer,
        song_artists,
        creattive_name,
        copyright_ownership,
        copyright_ownership_permissions,
        isrc_number,
        language_of_lyrics,
        language_of_lyrics_optional,
        ticktokClipStartTime,
    } = req.body;

    const song_mp3 = req.file ? req.file.path : null;

    if (!song_mp3) {
        return res.status(400).json({ message: 'No mp3 file uploaded' });
    }

    try {
        // Upload mp3 file to Cloudinary
        const result = await cloudinary.uploader.upload(song_mp3, { resource_type: 'auto' });

        // Merge song_artists and creattive_name
        const mergedArtistsAndCreattive = [...song_artists, ...creattive_name];

        // Update album document with Cloudinary secure_url
        const updatedAlbum = await Album.findByIdAndUpdate(
            req.params.id,
            {
                song_mp3: result.secure_url, // Update with Cloudinary secure_url
                song_title,
                song_writer,
                song_artists: mergedArtistsAndCreattive,
                creattive_name,
                copyright_ownership,
                copyright_ownership_permissions,
                isrc_number,
                language_of_lyrics,
                language_of_lyrics_optional,
                ticktokClipStartTime,
            },
            { new: true } // Return the updated document
        );

        if (!updatedAlbum) {
            return res.status(404).json({ message: 'Album not found' });
        }

        res.json({ message: 'Update successful', updatedAlbum });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error', error: err });
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
        creattive_name: req.body.creattive_name,
        roles: req.body.roles,
        copyright_ownership: req.body.copyright_ownership,
        copyright_ownership_permissions: req.body.copyright_ownership_permissions,
        isrc_number: req.body.isrc_number,
        language_of_lyrics: req.body.language_of_lyrics,
        language_of_lyrics_optional: req.body.language_of_lyrics_optional,
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

// Export the router
module.exports = router;
