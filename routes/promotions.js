// routes/promotions.js
const express = require('express');
const router = express.Router();
const Promotions = require('../models/Promotions');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME, // Replace with your Cloudinary cloud name
    api_key: process.env.API_KEY, // Replace with your Cloudinary API key
    api_secret: process.env.API_SECRET // Replace with your Cloudinary API secret
});

// Set up Cloudinary storage for multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    folder: 'promotions', // The name of the folder in Cloudinary
    allowedFormats: ['jpg', 'png', 'jpeg'], // Allowed formats
    transformation: [{ width: 500, height: 500, crop: 'limit' }] // Example transformation
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

// Endpoint for uploading a promotion
router.post('/promotions', upload.single('promopic'), async (req, res) => {
    try {
        const { hyperLink } = req.body; // Get the hyperlink from the request
        const promopicUrl = req.file.path; // Get the uploaded image URL

        const newPromotion = new Promotions({
            promopicUrl,
            hyperLink
        });

        await newPromotion.save(); // Save the promotion to the database
        res.status(201).json({ message: 'Promotion created successfully', promotion: newPromotion });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading promotion', error: error.message });
    }
});

// Endpoint for getting all promotions
router.get('/promotions',validateToken, async (req, res) => {
    try {
        const promotions = await Promotions.find(); // Fetch all promotions
        res.status(200).json(promotions);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching promotions', error: error.message });
    }
});

module.exports = router;
