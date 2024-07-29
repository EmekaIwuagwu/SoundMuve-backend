const router = require("express").Router();
const Currency = require("../models/Currency");

router.post('/currency', async (req, res) => {
    try {
        const { currency_name, currency_symbol } = req.body;

        // Create a new currency instance
        const currency = new Currency({
            currency_name,
            currency_symbol
        });

        // Save the currency to the database
        await currency.save();
        res.status(201).json({ message: 'Currency saved successfully', currency });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to list all currencies
router.get('/currencies', async (req, res) => {
    try {
        // Fetch all currencies from the database
        const currencies = await Currency.find();
        res.status(200).json(currencies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;