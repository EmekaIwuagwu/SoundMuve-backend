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

const jpegStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'album_covers',
        allowed_formats: ['jpg', 'jpeg', 'png'],
    },
});

const imgParser = multer({ storage: jpegStorage });

const validateToken = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(" ")[1];
    if (!token) {
        return res.status(422).json({ message: "Please Provide Token!" });
    }
    // Token validation logic (e.g., JWT verification) can be added here.
    next();
};

const checkAuth = (req, res, next) => {
    if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ") ||
        !req.headers.authorization.split(" ")[1]
    ) {
        return res.status(422).json({ message: "Please Provide Token!" });
    }
    next();
};


router.get('/GetMyAlbumsByEmail', checkAuth, async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ message: "Email is required!" });
        }

        const albums = await Album.find({ email });

        if (albums.length === 0) {
            return res.status(404).json({ message: "No albums found for this email!" });
        }

        // Retrieve songs for each album and calculate the number of songs
        const albumsWithSongs = await Promise.all(
            albums.map(async (album) => {
                const songs = await Song.find({ album_id: album._id.toString() });
                return {
                    ...album._doc,
                    songs,
                    numberOfSongs: songs.length // Calculate number of songs
                };
            })
        );

        res.status(200).json({ message: "Albums Retrieved", albums: albumsWithSongs });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to upload songs to Cloudinary and save song details in MongoDB
router.post('/page4', parser.single('song_mp3'), async (req, res) => {
    
    if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ") ||
        !req.headers.authorization.split(" ")[1]
    ) {
        return res.status(422).json({ message: "Please Provide Token!" });
    }

    const {
        email,
        song_title,
        song_writer,
        creative_name,
        creative_role,
        copyright_ownership,
        copyright_ownership_permissions,
        isrc_number,
        album_id,
        language_of_lyrics,
        lyrics,
        ticktokClipStartTime
    } = req.body;

    try {
        if (!req.file) {
            return res.status(400).send({ message: 'No file uploaded' });
        }

        // Upload file to Cloudinary
        cloudinary.uploader.upload(req.file.path, { resource_type: 'raw' }, async (error, result) => {
            if (error) {
                console.error('Cloudinary Error:', error); // Log Cloudinary error
                return res.status(500).send({ message: 'Cloudinary upload failed', error });
            }

            try {
                // Create a new song document
                const newSong = new Song({
                    email,
                    song_mp3: result.secure_url,
                    song_title,
                    song_writer: song_writer.split(','),
                    creative_name: creative_name.split(','),
                    creative_role: creative_role.split(','),
                    copyright_ownership,
                    copyright_ownership_permissions,
                    isrc_number,
                    album_id,
                    language_of_lyrics,
                    lyrics,
                    ticktokClipStartTime
                });

                // Save song document to MongoDB
                const savedSong = await newSong.save();
                res.status(200).send({ message: 'Song uploaded and saved successfully', song: savedSong });
            } catch (saveError) {
                console.error('MongoDB Save Error:', saveError); // Log MongoDB save error
                res.status(500).send({ message: 'Failed to save song', error: saveError });
            }
        });
    } catch (error) {
        console.error('Server Error:', error); // Log server error
        res.status(500).send({ message: 'Server error', error });
    }
});

router.put('/editSong/:id', parser.single('song_mp3'), async (req, res) => {

    if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ") ||
        !req.headers.authorization.split(" ")[1]
    ) {
        return res.status(422).json({ message: "Please Provide Token!" });
    }

    const {
        email,
        song_title,
        song_writer,
        creative_role,
        copyright_ownership,
        copyright_ownership_permissions,
        isrc_number,
        language_of_lyrics,
        lyrics,
        ticktokClipStartTime
    } = req.body;

    try {
        // Find the existing song document
        const song = await Song.findById(req.params.id);
        if (!song) {
            return res.status(404).send({ message: 'Song not found' });
        }

        // Update song information
        song.email = email || song.email;
        song.song_title = song_title || song.song_title;
        song.song_writer = song_writer ? song_writer.split(',') : song.song_writer;
        song.creative_role = creative_role ? creative_role.split(',') : song.creative_role;
        song.copyright_ownership = copyright_ownership || song.copyright_ownership;
        song.copyright_ownership_permissions = copyright_ownership_permissions || song.copyright_ownership_permissions;
        song.isrc_number = isrc_number || song.isrc_number;
        song.language_of_lyrics = language_of_lyrics || song.language_of_lyrics;
        song.lyrics = lyrics || song.lyrics;
        song.ticktokClipStartTime = ticktokClipStartTime || song.ticktokClipStartTime;

        if (req.file) {
            // Upload the new file to Cloudinary if provided
            const result = await cloudinary.uploader.upload(req.file.path, { resource_type: 'raw' });
            song.song_mp3 = result.secure_url;
        }

        // Save the updated song document to MongoDB
        const updatedSong = await song.save();
        res.status(200).send({ message: 'Song updated successfully', song: updatedSong });
    } catch (error) {
        console.error('Error:', error); // Log error for debugging
        res.status(500).send({ message: 'Server error', error });
    }
});


router.get('/getAlbumbsByNameAndEmail', async (req, res) => {
    try {
        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const { artist_name, email } = req.query;

        if (!artist_name || !email) {
            return res.status(400).json({ message: "Artist name and email are required!" });
        }

        const albums = await Album.find({ artist_name, email });

        if (!albums || albums.length === 0) {
            return res.status(404).json({ message: "No albums found for the given artist name and email." });
        }

        res.status(200).json(albums);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
});

router.post('/albums', async (req, res) => {
    try {
        // Check if authorization token is provided
        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        // Destructure request body data
        const {
            email, album_title, artist_name, appleMusicUrl, spotifyMusicUrl, language, primary_genre, secondary_genre, release_date, release_time,
            listenerTimeZone, otherTimeZone, label_name, soldWorldwide, recording_location, upc_ean, store,
            social_platform
        } = req.body;

        // Prepare album data with status set to 'PENDING'
        const albumData = {
            email,
            album_title,
            artist_name,
            appleMusicUrl,
            spotifyMusicUrl,
            language,
            primary_genre,
            secondary_genre,
            release_date,
            release_time,
            listenerTimeZone,
            otherTimeZone,
            label_name,
            soldWorldwide,
            recording_location,
            upc_ean,
            store,
            social_platform,
            status: 'PENDING'  // Set status to 'PENDING'
        };

        // Create a new Album instance and save it to the database
        const album = new Album(albumData);
        await album.save();

        // Return the created album in the response
        res.status(201).json(album);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
});


router.put('/albums/:id/page2', async (req, res) => {
    try {

        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const { id } = req.params;
        const { label_name, recording_location, soldWorldwide, upc_ean } = req.body;

        const updatedAlbum = await Album.findByIdAndUpdate(
            id,
            {
                label_name: label_name || null,
                recording_location: recording_location || null,
                soldWorldwide: soldWorldwide || null,
                upc_ean: upc_ean || null,
            },
            { new: true }
        );

        res.json(updatedAlbum);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT endpoint for page 3
router.put('/albums/:id/page3', async (req, res) => {
    try {

        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const { id } = req.params;
        const { store, social_platform } = req.body;

        const updatedAlbum = await Album.findByIdAndUpdate(
            id,
            {
                store: store || null,
                social_platform: social_platform || null,
            },
            { new: true }
        );

        res.json(updatedAlbum);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 1. Update Album Data by ID and Email
router.put('/albums/:id', async (req, res) => {
    try {

        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const { id } = req.params;
        const { email } = req.body;

        const updatedData = {
            appleMusicUrl: req.body.appleMusicUrl,
            spotifyMusicUrl: req.body.spotifyMusicUrl,
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
            song_cover_url: req.body.song_cover_url,
        };

        const album = await Album.findOneAndUpdate(
            { _id: id, email: email },
            updatedData,
            { new: true } // Return the updated document
        );

        if (!album) {
            return res.status(404).json({ message: "Album not found or email does not match!" });
        }

        res.status(200).json({ message: "Update successful", album });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// 2. Get All Album Releases by Email
router.get('/albums', async (req, res) => {
    try {
        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const { email, artist_name } = req.query;

        if (!email || !artist_name) {
            return res.status(400).json({ message: "Email and Artist name are required!" });
        }

        const albums = await Album.find({ email: email, artist_name: artist_name });

        if (albums.length === 0) {
            return res.status(404).json({ message: "No albums found for this email and artist!" });
        }

        // Retrieve songs for each album and calculate the number of songs
        const albumsWithSongs = await Promise.all(
            albums.map(async (album) => {
                const songs = await Song.find({ album_id: album._id.toString() });
                return {
                    ...album._doc,
                    songs,
                    numberOfSongs: songs.length // Calculate number of songs
                };
            })
        );

        res.status(200).json({ message: "Albums Retrieved", albums: albumsWithSongs });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// PUT endpoint for page 5 (upload cover image to Cloudinary)
router.put('/albums/:id/page5', imgParser.single('song_cover_url'), async (req, res) => {
    try {

        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const { id } = req.params;
        const song_cover_url = req.file ? req.file.path : null;

        const updatedAlbum = await Album.findByIdAndUpdate(
            id,
            {
                song_cover_url: song_cover_url || null,
            },
            { new: true }
        );

        res.json(updatedAlbum);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/albums-songs-by-email/:email', async (req, res) => {
    try {

        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const { email } = req.params;
        const { album_id } = req.query; // Fetch album_id from query parameters

        // Fetch albums with matching email and optionally matching album_id
        let albums;
        if (album_id) {
            albums = await Album.find({ email, _id: album_id }).lean();
        } else {
            albums = await Album.find({ email }).lean();
        }

        // Fetch songs with matching email
        const songs = await Song.find({ email }).lean();

        // Process each album
        const albumsWithSongs = albums.map(album => {
            const albumSongs = songs
                .filter(song => song.album_id === album._id.toString()) // Filter songs by album_id
                .map(song => ({
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

router.delete('/songs/:id', validateToken, async (req, res) => {
    try {
        const song = await Song.findByIdAndDelete(req.params.id);
        if (!song) {
            return res.status(404).send({ message: 'Song not found' });
        }
        res.send({ message: 'Song deleted successfully' });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
});

module.exports = router;
