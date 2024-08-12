const express = require('express');
const router = express.Router();
const UserPayout = require('../models/UserPayout');

// Middleware for token authorization
function verifyToken(req, res, next) {
    if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ") ||
        !req.headers.authorization.split(" ")[1]
    ) {
        return res.status(422).json({ message: "Please Provide Token!" });
    }
    // Proceed to the next middleware or route handler
    next();
}

router.post('/payout-details', verifyToken, async (req, res) => {
    try {
        const { email, currency, ...payoutData } = req.body;

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
                    'account_bank', 'account_number', 'narration'
                ];
                break;
            case 'GHS':
            case 'TZS':
            case 'UGX':
                requiredFields = [
                    'email', 'account_bank', 'account_number',
                    'narration', 'currency', 'destination_branch_code', 'beneficiary_name'
                ];
                break;
            case 'XOF':
            case 'XAF':
                requiredFields = [
                    'email', 'account_bank', 'account_number',
                    'beneficiary_name', 'narration',
                    'currency', 'debit_currency', 'destination_branch_code'
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
        const userPayout = new UserPayout({ email, currency, ...payoutData });
        await userPayout.save();

        res.status(201).json({ message: 'Payout saved successfully', userPayout });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to show payouts by email
router.get('/payouts/:email', verifyToken, async (req, res) => {
    try {
        const payouts = await UserPayout.find({ email: req.params.email });
        res.status(200).json(payouts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to update a payout by email and ID
router.put('/payout/:email/:id', verifyToken, async (req, res) => {
    try {
        const updatedPayout = await UserPayout.findOneAndUpdate(
            { email: req.params.email, _id: req.params.id },
            req.body,
            { new: true }
        );
        res.status(200).json(updatedPayout);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Endpoint to delete a payout by email and ID
router.delete('/payout/:email/:id', verifyToken, async (req, res) => {
    try {
        await UserPayout.findOneAndDelete({ email: req.params.email, _id: req.params.id });
        res.status(200).json({ message: 'Payout deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
