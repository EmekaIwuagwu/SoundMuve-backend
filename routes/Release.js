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
    cloud_name: "ddpq1fg9s",
    api_key: "137683632675467",
    api_secret: "IIBQ7EpXQJZnPmbRsL4sW9Pny4E",
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

        const { email, release_type, artist_name, language, primary_genre, secondary_genre, release_time, label_name, recording_location, upc_ean } = req.body;
        if (!email || !release_type || !artist_name || !language || !primary_genre || !secondary_genre || !release_time || !label_name || !recording_location || !upc_ean) {
            return res.status(400).send({ message: "All fields are required" });
        }

        // Create new user
        const release = new Release({
            email,
            release_type,
            artist_name,
            language,
            primary_genre,
            secondary_genre,
            release_time,
            label_name,
            recording_location,
            upc_ean,
            social_platform: null,
            song: null,
            song_writer: null,
            copyright_ownership: null,
            isrc_number: null,
            language_lyrics: null,
            lyrics: null,
            mp3_url : null,
            song_cover : null
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
        const release_type = req.body.release_type;
        const social_platform = req.body.social_platform;
        const song = req.body.song;
        const song_writer = req.body.song_writer;
        const copyright_ownership = req.body.copyright_ownership;
        const isrc_number = req.body.isrc_number;
        const language_lyrics = req.body.language_lyrics;
        const lyrics = req.body.lyrics;

        let updateData = {
            social_platform: social_platform,
            song: song,
            song_writer: song_writer,
            copyright_ownership: copyright_ownership,
            isrc_number: isrc_number,
            language_lyrics: language_lyrics,
            lyrics: lyrics,
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
            await Release.findOneAndUpdate({ email: email }, { $set: updateData }, { new: true })
                .then(updatedRelease => {
                    console.log('Updated Release:', updatedRelease);
                    console.log('Release updated');
                    res.send({ error: false, message: "Release Updated" });
                })
                .catch(err => {
                    console.error('An error occurred while updating the release:', err);
                    res.status(500).json({ message: err.message });
                });
        }

    } catch (error) {
        console.error('An error occurred:', error);
        res.status(404).json({ message: error.message });
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