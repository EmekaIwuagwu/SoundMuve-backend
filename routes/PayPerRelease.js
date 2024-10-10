require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose'); // Import mongoose
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const Cart = require('../models/Cart');
const Album = require('../models/Album');
const Song = require('../models/Song');
const Order = require('../models/Order');
const PromoCode = require('../models/PromoCode');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Middleware to authenticate JWT tokens
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Get token from the 'Authorization' header

    if (!token) {
        return res.sendStatus(401); // Unauthorized
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Forbidden
        }
        req.user = user; // Save the user information in request
        next(); // Proceed to the next middleware or route handler
    });
};

// Add item to cart
router.post('/add-to-cart', authenticateToken, async (req, res) => {
    const { email, items } = req.body; // Accepting an array of items

    // Validate the input
    if (!email || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Email and items are required. Items should be an array.' });
    }

    try {
        let cart = await Cart.findOne({ email });
        if (!cart) {
            cart = new Cart({ email, items: [], total: 0 });
        }

        for (const itemData of items) {
            const { type, _id } = itemData; // Destructure type and _id from each item

            // Validate each item's input
            if (!type || !_id) {
                return res.status(400).json({ message: 'Type and _id are required for each item.' });
            }

            let price = 0;
            let itemName = null;

            // Determine the price and fetch the item based on type
            if (type === 'single') {
                price = 25;
                console.log(`Looking for single with ID ${_id}`);
                const item = await Song.findById(_id); // Use _id here
                if (item) {
                    itemName = item.song_title; // Fetch the song name
                } else {
                    console.log(`Single with ID ${_id} not found`);
                }
            } else if (type === 'album') {
                price = 45;
                console.log(`Looking for album with ID ${_id}`);
                const item = await Album.findById(_id); // Use _id here
                if (item) {
                    itemName = item.album_title; // Fetch the album name
                } else {
                    console.log(`Album with ID ${_id} not found`);
                }
            } else {
                return res.status(400).json({ message: 'Invalid type. Must be single or album.' });
            }

            // Check if the item exists
            if (!itemName) {
                return res.status(404).json({ message: `${type} with _id ${_id} not found.` });
            }

            // Push the item details to the cart
            cart.items.push({ type, _id, name: itemName, price }); // Store _id instead of id
            cart.total += price; // Increment total
        }

        await cart.save();

        res.json({ message: 'Items added to cart', cart });
    } catch (error) {
        res.status(500).json({ message: 'Error adding to cart', error: error.message });
    }
});


// Apply promo code to cart
router.post('/apply-promo', authenticateToken, async (req, res) => {
    const { email, code, itemIds } = req.body; // Accept an array of item IDs

    // Validate the input
    if (!email || !code || !itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return res.status(400).json({ message: 'Email, promo code, and item IDs are required. Item IDs should be an array.' });
    }

    try {
        const cart = await Cart.findOne({ email });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found.' });
        }

        const promo = await PromoCode.findOne({ code });
        if (!promo) {
            return res.status(404).json({ message: 'Invalid promo code.' });
        }

        const discountPercentage = promo.discount / 100;

        // Track the original prices and apply the discount to each specified item
        const originalPrices = [];
        const itemsToDiscount = [];

        for (const itemId of itemIds) {
            const itemInCart = cart.items.find(item => item._id.toString() === itemId);

            if (!itemInCart) {
                return res.status(404).json({ message: `Item with ID ${itemId} not found in the cart.` });
            }

            // Calculate the discount amount
            const discountAmount = itemInCart.price * discountPercentage;

            // Store the original price
            originalPrices.push({ itemId, originalPrice: itemInCart.price });

            // Apply the discount
            itemInCart.price -= discountAmount;
            itemsToDiscount.push(itemInCart); // Keep track of discounted items
        }

        // Recalculate the total
        cart.total = cart.items.reduce((total, item) => total + item.price, 0);

        await cart.save();
        res.json({ message: 'Promo code applied', cart, originalPrices, itemsToDiscount });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error applying promo code', error: error.message });
    }
});


// Checkout
router.post('/checkout', authenticateToken, async (req, res) => {
    const { email, paymentMethodId } = req.body;

    // Validate the required fields
    if (!email || !paymentMethodId) {
        return res.status(400).json({ message: 'Email and payment method are required for checkout.' });
    }

    try {
        // Fetch the cart for the given email
        const cart = await Cart.findOne({ email });
        if (!cart || cart.items.length === 0) {
            return res.status(404).json({ message: 'Cart is empty.' });
        }

        // Create a payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(cart.total * 100), // Stripe expects amounts in cents
            currency: 'usd',
            payment_method: paymentMethodId, // Pass the payment method ID received from the frontend
            confirmation_method: 'manual', // Manual confirmation
            confirm: true, // Confirm the payment intent immediately
        });

        // Create a new order
        const order = new Order({
            email: cart.email,
            items: cart.items,
            total: cart.total,
            paymentStatus: 'paid', // Set payment status to 'paid'
        });
        await order.save();

        // Clear the cart after successful payment
        await Cart.findOneAndDelete({ email });

        // Return the payment intent response to the client
        res.json({
            message: 'Payment successful',
            paymentIntentId: paymentIntent.id, // Return the Payment Intent ID
            order,
        });
    } catch (error) {
        // Handle different error scenarios from Stripe API
        if (error.type === 'StripeCardError') {
            // Card was declined
            return res.status(400).json({ message: 'Your card was declined.', error: error.message });
        } else {
            return res.status(500).json({ message: 'Error during checkout', error: error.message });
        }
    }
});

// Export the router
module.exports = router;
