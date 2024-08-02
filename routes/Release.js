require('dotenv').config()
const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require("multer");
const Release = require("../models/Release");

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
  });

//const multer = require("multer");

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      return {
        folder: 'uploads', // Folder name in Cloudinary
        resource_type: file.mimetype.startsWith('audio') ? 'video' : 'image' // mp3 files are considered as 'video' in Cloudinary
      };
    },
  });

const upload = multer({ storage: storage });

router.post("/create-release", async (req, res) => {
    try {
        // Check if the required fields are provided
        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const { 
            email, release_type, appleMusicUrl, spotifyMusicUrl, artist_name, language, 
            primary_genre, secondary_genre, release_time, 
            label_name, recording_location, song_title, explicitLyrics, releaseDate, upc_ean, 
            listenerTimeZone, generalTimeZone, soldWorldwide 
        } = req.body;

        if (!email || !release_type || !artist_name || !language ||
            !primary_genre || !secondary_genre || !release_time || 
            !label_name || !song_title || !explicitLyrics || !releaseDate || !recording_location || 
            !listenerTimeZone || !generalTimeZone || !soldWorldwide) {
            return res.status(400).send({ message: "All fields are required" });
        }

        // Create new release
        const release = new Release({
            email,
            release_type,
            artist_name,
            language,
            primary_genre,
            secondary_genre,
            release_time,
            appleMusicUrl,
            spotifyMusicUrl,
            label_name,
            recording_location,
            upc_ean,
            listenerTimeZone, 
            generalTimeZone,
            song_title,
            explicitLyrics,
            releaseDate,
            soldWorldwide,
            social_platform: null,
            song_writer: null,
            copyright_ownership: null,
            copyright_ownership_permissions: null,
            store: null,
            tikTokClipStartTime: null,
            isrc_number: null,
            language_lyrics: null,
            lyrics: null,
            mp3_url: null,
            song_cover: null
        });

        const new_release = await release.save();
        res.send({ message: "Release Saved", new_release });
    } catch (err) {
        res.status(500).send({ message: "Server error", error: err.message });
    }
});

router.patch("/update-release", upload.fields([{ name: 'mp3_file', maxCount: 1 }, { name: 'cover_photo', maxCount: 1 }]), async (req, res) => {
    try {
        console.log('Request received');
        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            console.log('No authorization token provided');
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const email = req.body.email;
        const store = req.body.store;
        const release_type = req.body.release_type;
        const social_platform = req.body.social_platform;
        const songArtistsCreativeRole = req.body.songArtistsCreativeRole; // Expecting an array
        const song = req.body.song;
        const song_writer = req.body.song_writer; // Expecting an array
        const creative_name = req.body.creative_name;
        const copyright_ownership = req.body.copyright_ownership;
        const copyright_ownership_permissions = req.body.copyright_ownership_permissions;
        const isrc_number = req.body.isrc_number;
        const status = 'Pending';
        const language_lyrics = req.body.language_lyrics;
        const lyrics = req.body.lyrics;
        const tikTokClipStartTime = req.body.tikTokClipStartTime;

        let updateData = {
            social_platform: social_platform,
            store: store,
            song: song,
            song_writer: Array.isArray(song_writer) ? song_writer : [song_writer], // Ensure it's an array
            creative_name: creative_name,
            songArtistsCreativeRole: Array.isArray(songArtistsCreativeRole) ? songArtistsCreativeRole : [songArtistsCreativeRole], // Ensure it's an array
            copyright_ownership: copyright_ownership,
            copyright_ownership_permissions: copyright_ownership_permissions,
            isrc_number: isrc_number,
            status : status,
            language_lyrics: language_lyrics,
            lyrics: lyrics,
            tikTokClipStartTime: tikTokClipStartTime
        };

        if (req.files['mp3_file']) {
            console.log('MP3 file received');
            updateData.mp3_url = req.files['mp3_file'][0].path;
        }

        if (req.files['cover_photo']) {
            console.log('Cover photo received');
            updateData.song_cover = req.files['cover_photo'][0].path;
        }

        if (release_type == "Single") {
            console.log('Updating release');
            console.log('Email:', email);
            console.log('Update Data:', updateData);
            const updatedRelease = await Release.findOneAndUpdate(
                { email: email },
                { $set: updateData },
                { new: true }
            );
            console.log('Updated Release:', updatedRelease);
            console.log('Release updated');
            res.send({ error: false, message: "Release Updated", updatedRelease });
        } else {
            res.status(400).json({ message: "Invalid release type" });
        }
    } catch (error) {
        console.error('An error occurred:', error);
        res.status(404).json({ message: error.message });
    }
});


router.put('/checkAndUpdateRelease', async (req, res) => {
    try {
        // Check if the required fields are provided
        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const {
            email, release_type, artist_name, language,
            primary_genre, secondary_genre, release_time,
            label_name, recording_location, song_title, explicitLyrics, releaseDate, upc_ean,
            listenerTimeZone, generalTimeZone, soldWorldwide
        } = req.body;

        if (!email) {
            return res.status(400).send({ message: "Email is required" });
        }

        // Find the release by email
        const release = await Release.findOne({ email });

        if (!release) {
            return res.status(404).json({ message: "Release not found" });
        }

        // Check each field and update if it is null
        const fieldsToUpdate = {
            release_type, artist_name, language, primary_genre,
            secondary_genre, release_time, label_name, recording_location,
            song_title, explicitLyrics, releaseDate, upc_ean,
            listenerTimeZone, generalTimeZone, soldWorldwide
        };

        let updateRequired = false;

        for (const [key, value] of Object.entries(fieldsToUpdate)) {
            if (release[key] === null) {
                release[key] = value;
                updateRequired = true;
            }
        }

        if (updateRequired) {
            await release.save();
            return res.status(200).json({ message: "Release updated successfully", release });
        } else {
            return res.status(200).json({ message: "No updates needed", release });
        }

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

router.get("/getReleaseByEmail/:email", async (req, res) => {
    try {
        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }
        const release = await Release.find({ email: req.params.email });
        res.status(200).json(release);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

module.exports = router;