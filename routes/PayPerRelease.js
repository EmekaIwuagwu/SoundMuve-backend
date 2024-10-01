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
    const { email, type, name } = req.body;

    if (!email || !type || !name) {
        return res.status(400).json({ message: 'Email, type, and name are required.' });
    }

    let price = 0;
    if (type === 'single') {
        price = 25;
    } else if (type === 'album') {
        price = 45;
    } else {
        return res.status(400).json({ message: 'Invalid type. Must be single or album.' });
    }

    try {
        let cart = await Cart.findOne({ email });
        if (!cart) {
            cart = new Cart({ email, items: [], total: 0 });
        }

        cart.items.push({ type, name, price });
        cart.total += price;

        await cart.save();

        res.json({ message: `${type} added to cart`, cart });
    } catch (error) {
        res.status(500).json({ message: 'Error adding to cart', error });
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

        // Extract item information and the total price from the cart
        const { items, total } = cart;

        // Optionally log the cart items for debugging
        console.log("Cart Items:", items);

        // Create a payment intent with Stripe using the total amount
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(total * 100), // Stripe accepts the amount in cents
            currency: 'usd',
            payment_method: paymentMethodId, // Payment method ID passed from the frontend
            confirmation_method: 'manual', // Manual confirmation for additional checks (optional)
            confirm: true, // Immediately confirm the payment intent
        });

        // Create a new order in the database after successful payment
        const order = new Order({
            email: cart.email,
            items: cart.items, // Use the items from the cart
            total: cart.total, // The total amount (after promo code application)
            paymentStatus: 'paid', // Set the payment status as 'paid'
        });
        await order.save(); // Save the order in the database

        // Clear the cart after successful payment
        await Cart.findOneAndDelete({ email });

        // Respond with the payment intent and the order details
        res.json({
            message: 'Payment successful',
            paymentIntentId: paymentIntent.id, // Return the Payment Intent ID for tracking
            order, // Return the order details as part of the response
        });
    } catch (error) {
        // Handle Stripe-specific errors
        if (error.type === 'StripeCardError') {
            // The card was declined
            return res.status(400).json({ message: 'Your card was declined.', error: error.message });
        } else {
            // Handle other potential errors
            return res.status(500).json({ message: 'Error during checkout', error: error.message });
        }
    }
});

// Export the router
module.exports = router;
