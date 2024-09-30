require('dotenv').config();
const express = require('express');
const Cart = require('../models/Cart');
const PromoCode = require('../models/PromoCode');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Add item to cart
router.post('/add-to-cart', async (req, res) => {
    const { type, name } = req.body;

    if (!type || !name) {
        return res.status(400).json({ message: 'Type and name are required.' });
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
        const cart = new Cart({
            type,
            name,
            price,
            total: price
        });
        await cart.save();

        res.json({ message: `${type} added to cart`, cart });
    } catch (error) {
        res.status(500).json({ message: 'Error adding to cart', error });
    }
});

// Apply promo code to cart
router.post('/apply-promo', async (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ message: 'Promo code is required.' });
    }

    try {
        const cart = await Cart.findOne(); // Assuming a single cart for simplicity
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

// Create promo code (admin functionality)
router.post('/create-promo', async (req, res) => {
    const { code, discount } = req.body;

    if (!code || !discount) {
        return res.status(400).json({ message: 'Code and discount are required.' });
    }

    try {
        const promoCode = new PromoCode({ code, discount });
        await promoCode.save();
        res.json({ message: 'Promo code created successfully', promoCode });
    } catch (error) {
        res.status(500).json({ message: 'Error creating promo code', error });
    }
});

// Checkout
router.post('/checkout', async (req, res) => {
    try {
        const cart = await Cart.findOne(); // Assuming a single cart for simplicity

        if (!cart) {
            return res.status(404).json({ message: 'Cart is empty.' });
        }

        // Create a Stripe session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: cart.name
                        },
                        unit_amount: Math.round(cart.total * 100), // Stripe takes amounts in cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: 'https://img.freepik.com/free-vector/3d-style-safety-shield-logo-with-checkmark-sign-safe-access_1017-51232.jpg?semt=ais_hybrid',
            cancel_url: 'https://c7.alamy.com/comp/HE551N/failed-stamp-sign-seal-HE551N.jpg',
        });

        res.json({ id: session.id });
    } catch (error) {
        res.status(500).json({ message: 'Error during checkout.', error });
    }
});

module.exports = router;
