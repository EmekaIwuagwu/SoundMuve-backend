const express = require('express');
const router = express.Router();
const UserPayout = require('../models/UserPayout');

// Middleware to check for Token authorization
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


// Helper function to remove null or undefined properties
const removeNullProperties = (obj) => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, value]) => value != null)
    );
};
// Endpoint to create payout details
router.post('/payout-details', checkToken, async (req, res) => {
    try {
        const { currency, email, ...payoutData } = req.body;

        let requiredFields = [];

        switch (currency) {
            case 'USD':
                requiredFields = [
                    'account_number', 'routing_number', 'swift_code',
                    'bank_name', 'beneficiary_name', 'beneficiary_address', 'beneficiary_country'
                ];
                break;
            case 'EUR':
                requiredFields = [
                    'account_number', 'routing_number', 'swift_code',
                    'bank_name', 'beneficiary_name', 'beneficiary_country',
                    'postal_code', 'street_number', 'street_name', 'city'
                ];
                break;
            case 'NGN':
                requiredFields = [
                    'account_bank', 'account_number'
                ];
                break;
            case 'GHS':
            case 'TZS':
            case 'UGX':
                requiredFields = [
                    'account_bank', 'account_number',
                    'destination_branch_code', 'beneficiary_name'
                ];
                break;
            case 'XOF':
            case 'XAF':
                requiredFields = [
                    'account_bank', 'account_number',
                    'beneficiary_name',
                    'debit_currency', 'destination_branch_code'
                ];
                break;
            default:
                return res.status(400).json({ message: 'Unsupported currency' });
        }

        // Validate that all required fields are present
        for (const field of requiredFields) {
            if (!payoutData[field]) {
                return res.status(400).json({ message: `${field} is required for currency ${currency}` });
            }
        }

        // Save the payout data
        const userPayout = new UserPayout({ currency, email, ...payoutData });
        await userPayout.save();

        res.status(201).json({ message: 'Payout saved successfully', userPayout });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to show payouts by email
router.get('/payouts/:email', checkToken, async (req, res) => {
    try {
        const payouts = await UserPayout.find({ email: req.params.email });

        // Remove null or undefined properties from each payout
        const filteredPayouts = payouts.map(payout => removeNullProperties(payout.toObject()));

        res.status(200).json(filteredPayouts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to update a payout by email and ID
router.put('/payout/:email/:id', checkToken, async (req, res) => {
    try {
        const updatedPayout = await UserPayout.findOneAndUpdate(
            { _id: req.params.id, email: req.params.email },
            req.body,
            { new: true }
        );
        if (!updatedPayout) {
            return res.status(404).json({ message: 'Payout not found' });
        }
        res.status(200).json(updatedPayout);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to delete a payout by email and ID
router.delete('/payout/:email/:id', checkToken, async (req, res) => {
    try {
        const deletedPayout = await UserPayout.findOneAndDelete({
            _id: req.params.id,
            email: req.params.email
        });
        if (!deletedPayout) {
            return res.status(404).json({ message: 'Payout not found' });
        }
        res.status(200).json({ message: 'Payout deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
