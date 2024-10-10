const express = require('express');
const router = express.Router();
const MusicDistribution = require('../models/MusicDistribution');

// Middleware to check for the token
const checkToken = (req, res, next) => {
    if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ") ||
        !req.headers.authorization.split(" ")[1]
    ) {
        return res.status(422).json({ message: "Please Provide Token!" });
    }
    next();
};

// CREATE profile
router.post('/input-profile', checkToken, async (req, res) => {
    try {
        const { youtubeLink, facebookInstaLink, xLink, email } = req.body;

        // Ensure email is provided
        if (!email) {
            return res.status(400).json({ message: "Email is required." });
        }

        const newProfile = new MusicDistribution({
            youtubeLink,
            facebookInstaLink,
            xLink,
            email
        });

        const savedProfile = await newProfile.save();
        res.status(201).json({
            message: "Profile created successfully.",
            data: savedProfile
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to create profile.", error: err.message });
    }
});

// READ (Get profile by email or id)
router.get('/get-profile', checkToken, async (req, res) => {
    try {
        const { email, _id } = req.query;

        // Find by either email or _id
        let profile;
        if (_id) {
            profile = await MusicDistribution.findById(_id);
        } else if (email) {
            profile = await MusicDistribution.findOne({ email });
        } else {
            return res.status(400).json({ message: "Email or ID is required." });
        }

        if (!profile) {
            return res.status(404).json({ message: "Profile not found." });
        }

        res.status(200).json({
            message: "Profile retrieved successfully.",
            data: profile
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to retrieve profile.", error: err.message });
    }
});

// UPDATE profile
router.put('/update-profile', checkToken, async (req, res) => {
    try {
        const { email, _id } = req.body;

        // Find by either email or _id
        let profile;
        if (_id) {
            profile = await MusicDistribution.findById(_id);
        } else if (email) {
            profile = await MusicDistribution.findOne({ email });
        } else {
            return res.status(400).json({ message: "Email or ID is required to update profile." });
        }

        if (!profile) {
            return res.status(404).json({ message: "Profile not found." });
        }

        // Update fields
        profile.youtubeLink = req.body.youtubeLink || profile.youtubeLink;
        profile.facebookInstaLink = req.body.facebookInstaLink || profile.facebookInstaLink;
        profile.xLink = req.body.xLink || profile.xLink;

        const updatedProfile = await profile.save();
        res.status(200).json({
            message: "Profile updated successfully.",
            data: updatedProfile
        });
    } catch (err) {
        res.status(500).json({ message: "Failed to update profile.", error: err.message });
    }
});

// DELETE profile
router.delete('/delete-profile', checkToken, async (req, res) => {
    try {
        const { email, _id } = req.query;

        // Find by either email or _id
        let profile;
        if (_id) {
            profile = await MusicDistribution.findById(_id);
        } else if (email) {
            profile = await MusicDistribution.findOne({ email });
        } else {
            return res.status(400).json({ message: "Email or ID is required to delete profile." });
        }

        if (!profile) {
            return res.status(404).json({ message: "Profile not found." });
        }

        await profile.remove();
        res.status(200).json({ message: "Profile deleted successfully." });
    } catch (err) {
        res.status(500).json({ message: "Failed to delete profile.", error: err.message });
    }
});

module.exports = router;
