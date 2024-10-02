require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose'); // Import mongoose
const jwt = require('jsonwebtoken'); // Import jsonwebtoken
const Cart = require('../models/Cart');
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
    const { email, type, id } = req.body;

    if (!email || !type || !id) {
        return res.status(400).json({ message: 'Email, type, and id are required.' });
    }

    let price = 0;
    let item = null;

    // Determine the price and fetch the item based on type
    if (type === 'single') {
        price = 25;
        item = await Song.findById(id);
    } else if (type === 'album') {
        price = 45;
        item = await Album.findById(id);
    } else {
        return res.status(400).json({ message: 'Invalid type. Must be single or album.' });
    }

    // Check if the item exists
    if (!item) {
        return res.status(404).json({ message: `${type} not found.` });
    }

    try {
        let cart = await Cart.findOne({ email });
        if (!cart) {
            cart = new Cart({ email, items: [], total: 0 });
        }

        // Push the item details to the cart
        cart.items.push({ type, id, price }); // Store the ID instead of name
        cart.total += price;

        await cart.save();

        res.json({ message: `${type} added to cart`, cart });
    } catch (error) {
        res.status(500).json({ message: 'Error adding to cart', error: error.message });
    }
});

// Apply promo code to cart
router.post('/apply-promo', authenticateToken, async (req, res) => {
    const { email, code, itemId } = req.body;

    if (!email || !code || !itemId) {
        return res.status(400).json({ message: 'Email, promo code, and item ID are required.' });
    }

    try {
        const cart = await Cart.findOne({ email });

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found.' });
        }

        const itemInCart = cart.items.find(item => item._id.toString() === itemId);
        if (!itemInCart) {
            return res.status(404).json({ message: 'Item not found in the cart.' });
        }

        const promo = await PromoCode.findOne({ code });
        if (!promo) {
            return res.status(404).json({ message: 'Invalid promo code.' });
        }

        const discountPercentage = promo.discount / 100;
        const discountAmount = itemInCart.price * discountPercentage;

        const originalPrice = itemInCart.price;
        itemInCart.price -= discountAmount;

        cart.total = cart.items.reduce((total, item) => total + item.price, 0);

        await cart.save();
        res.json({ message: 'Promo code applied', cart, originalPrice });
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
