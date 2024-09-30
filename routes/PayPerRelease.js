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
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required for checkout.' });
    }

    try {
        const cart = await Cart.findOne({ email });
        if (!cart || cart.items.length === 0) {
            return res.status(404).json({ message: 'Cart is empty.' });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: cart.items.map(item => ({
                price_data: {
                    currency: 'usd',
                    product_data: { name: item.name },
                    unit_amount: Math.round(item.price * 100),
                },
                quantity: 1,
            })),
            mode: 'payment',
            success_url: 'http://localhost:3000/success',
            cancel_url: 'http://localhost:3000/cancel',
        });

        const order = new Order({
            email: cart.email,
            items: cart.items,
            total: cart.total,
            paymentStatus: 'pending',
        });
        await order.save();

        // Clear the cart after order completion
        await Cart.findOneAndDelete({ email });

        res.json({ id: session.id });
    } catch (error) {
        res.status(500).json({ message: 'Error during checkout', error });
    }
});

// Clear the cart after order completion
router.delete('/clear-cart', authenticateToken, async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required to clear the cart.' });
    }

    try {
        const cart = await Cart.findOneAndDelete({ email }); // Deletes the cart for the specified email

        if (!cart) {
            return res.status(404).json({ message: 'Cart not found.' });
        }

        res.json({ message: 'Cart cleared successfully.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error clearing the cart', error });
    }
});

// Export the router
module.exports = router;
