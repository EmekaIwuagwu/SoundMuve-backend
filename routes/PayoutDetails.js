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
        const { currency, email, meta } = req.body;

        // Check for basic required fields
        if (!currency || !email) {
            return res.status(400).json({ message: 'Currency and email are required.' });
        }

        // Define required fields based on currency
        let requiredFields = [];
        let isMetaRequired = false;

        switch (currency) {
            case 'USD':
                requiredFields = [
                    'account_number', 'routing_number', 'swift_code',
                    'bank_name', 'beneficiary_name', 'beneficiary_address', 'beneficiary_country'
                ];
                isMetaRequired = true;
                break;
            case 'EUR':
                requiredFields = [
                    'account_number', 'routing_number', 'swift_code',
                    'bank_name', 'beneficiary_name', 'beneficiary_country',
                    'postal_code', 'street_number', 'street_name', 'city'
                ];
                isMetaRequired = true;
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

        // Validate the meta field if required
        if (isMetaRequired) {
            if (!meta || !Array.isArray(meta) || !meta[0]) {
                return res.status(400).json({ message: 'Meta is required and should be an array with at least one object.' });
            }

            // Validate that all required fields are present in meta[0]
            for (const field of requiredFields) {
                if (!meta[0][field]) {
                    return res.status(400).json({ message: `${field} is required for currency ${currency}` });
                }
            }
        } else {
            // Validate that all required fields are present in req.body for other currencies
            for (const field of requiredFields) {
                if (!req.body[field]) {
                    return res.status(400).json({ message: `${field} is required for currency ${currency}` });
                }
            }
        }

        // Prepare the payout data based on the currency and meta fields
        const payoutData = { currency, email };
        if (isMetaRequired) {
            Object.assign(payoutData, meta[0]);
        } else {
            requiredFields.forEach(field => {
                if (req.body[field]) {
                    payoutData[field] = req.body[field];
                }
            });
        }

        // Save the payout data
        const userPayout = new UserPayout(removeNullProperties(payoutData));
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
