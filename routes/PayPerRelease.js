require('dotenv').config();
const express = require('express');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const PromoCode = require('../models/PromoCode');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Add item to cart
router.post('/add-to-cart', async (req, res) => {
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
router.post('/apply-promo', async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ message: 'Email and promo code are required.' });
    }

    try {
        const cart = await Cart.findOne({ email });
        if (!cart) {
            return res.status(404).json({ message: 'Cart is empty.' });
        }

        const promo = await PromoCode.findOne({ code });
        if (!promo) {
            return res.status(404).json({ message: 'Invalid promo code.' });
        }

        const discountPercentage = promo.discount / 100;
        const discountAmount = cart.total * discountPercentage;
        cart.total -= discountAmount;

        await cart.save();
        res.json({ message: 'Promo code applied', cart });
    } catch (error) {
        res.status(500).json({ message: 'Error applying promo code', error });
    }
});

// Checkout
router.post('/checkout', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required for checkout.' });
    }

    try {
        const cart = await Cart.findOne({ email });
        if (!cart || cart.items.length === 0) {
            return res.status(404).json({ message: 'Cart is empty.' });
        }

        // Create a Stripe session
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

        // Save the order
        const order = new Order({
            email: cart.email,
            items: cart.items,
            total: cart.total,
            paymentStatus: 'pending'
        });
        await order.save();

        res.json({ id: session.id });
    } catch (error) {
        res.status(500).json({ message: 'Error during checkout', error });
    }
});

// Export the router
module.exports = router;
