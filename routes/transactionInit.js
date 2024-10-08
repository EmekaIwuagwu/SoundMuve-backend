// routes/transaction.js
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const router = express.Router();
const User = require('../models/User');
const Transactions = require('../models/Transactions');
const UserPayout = require('../models/UserPayout');
const TransactionApproval = require('../models/transactionApproval');

const FLUTTERWAVE_API_URL = 'https://api.flutterwave.com/v3/transfers';

// Helper function to retry payment via fallback endpoints
const retryPayment = async (endpoint, transferData, jwtToken) => {
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.JWT_TOKEN}`,
            },
            body: JSON.stringify(transferData)
        });
        return await response.json();
    } catch (error) {
        console.error(`Error retrying payment at ${endpoint}:`, error);
        return { status: 'error', message: error.message };
    }
};

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

router.post('/initiate', checkToken, async (req, res) => {
    const { email, narration, amount, currency } = req.body;

    // Validate input
    if (!email || !narration || !amount || !currency) {
        return res.status(400).json({ message: 'Email, narration, amount, and currency are required.' });
    }

    try {
        // Find the user and their balance
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Find the payout information matching the email and currency
        const payout = await UserPayout.findOne({ email, currency });
        if (!payout) {
            return res.status(404).json({ message: 'Payout information not found for the specified currency.' });
        }

        // Check if the user has enough balance
        if (user.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance.' });
        }

        // Create a new transaction with status "Pending"
        const transaction = new Transactions({
            email,
            narration,
            credit: 0,
            debit: amount,
            amount,
            currency,
            status: 'Pending',
            balance: user.balance - amount,
        });

        await transaction.save();
        res.status(201).json({ message: 'Transaction initiated and saved for approval.', transaction });

    } catch (error) {
        console.error('Error initiating transaction:', error);
        res.status(500).json({ message: error.message });
    }
});

// Route to approve a transaction
router.post('/approve/:transactionId', checkToken, async (req, res) => {
    const { transactionId } = req.params;
    const { approved, adminComments } = req.body;

    try {
        const transaction = await Transactions.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found.' });
        }

        if (approved) {
            // Fetch user payout information matching email and transaction currency
            const payout = await UserPayout.findOne({ email: transaction.email, currency: transaction.currency });
            if (!payout) {
                return res.status(404).json({ message: 'Payout information not found for the specified currency.' });
            }

            // Prepare Flutterwave request data based on currency
            let transferData = {};
            switch (transaction.currency) {
                case 'USD':
                    transferData = {
                        amount: transaction.amount,
                        narration: transaction.narration,
                        currency: 'USD',
                        beneficiary_name: payout.beneficiary_name,
                        meta: [
                            {
                                account_number: payout.account_number,
                                routing_number: payout.routing_number || '',
                                swift_code: payout.swift_code || '',
                                bank_name: payout.bank_name || '',
                                beneficiary_name: payout.beneficiary_name,
                                beneficiary_address: payout.beneficiary_address || '',
                                beneficiary_country: payout.beneficiary_country || ''
                            }
                        ]
                    };
                    break;
                case 'EUR':
                    transferData = {
                        amount: transaction.amount,
                        narration: transaction.narration,
                        currency: 'EUR',
                        beneficiary_name: payout.beneficiary_name,
                        meta: [
                            {
                                account_number: payout.account_number,
                                routing_number: payout.routing_number || '',
                                swift_code: payout.swift_code || '',
                                bank_name: payout.bank_name || '',
                                beneficiary_name: payout.beneficiary_name,
                                beneficiary_country: payout.beneficiary_country || '',
                                postal_code: payout.postal_code || '',
                                street_number: payout.street_number || '',
                                street_name: payout.street_name || '',
                                city: payout.city || ''
                            }
                        ]
                    };
                    break;
                // Handle other currencies as needed
                default:
                    return res.status(400).json({ message: 'Unsupported currency.' });
            }

            // Log transfer data for debugging
            console.log('Transfer Data being sent to Flutterwave:', JSON.stringify(transferData, null, 2));

            try {
                // Call Flutterwave API to initiate the payout using node-fetch
                const response = await fetch(FLUTTERWAVE_API_URL, {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${process.env.SECRET_KEY}`,
                    },
                    body: JSON.stringify(transferData)
                });

                const responseData = await response.json();
                console.log('Flutterwave API Response:', JSON.stringify(responseData, null, 2)); // Debug log

                if (responseData.status === 'success') {
                    // Update transaction status to "Completed"
                    transaction.status = 'Completed';
                    await transaction.save();

                    // Save approval record
                    await TransactionApproval.create({
                        transactionId,
                        approved: true,
                        adminComments
                    });

                    res.status(200).json({ message: 'Transaction approved and payout initiated.', response: responseData });
                } else {
                    console.error('Failed to initiate payout:', responseData.message); // Debug log
                    res.status(400).json({
                        message: 'Failed to initiate payout.',
                        error: responseData.message || 'Unknown error',
                        response: responseData
                    });
                }
            } catch (apiError) {
                console.error('Flutterwave API Error:', apiError);
                res.status(500).json({ message: 'Error communicating with payment gateway.', error: apiError.message });
            }
        } else {
            // Update transaction status to "Rejected"
            transaction.status = 'Rejected';
            await transaction.save();

            // Save approval record
            await TransactionApproval.create({
                transactionId,
                approved: false,
                adminComments
            });

            res.status(200).json({ message: 'Transaction rejected.' });
        }
    } catch (error) {
        console.error('Error approving transaction:', error);
        res.status(500).json({ message: error.message });
    }
});

router.post('/initiatePaypalTransaction', checkToken, async (req, res) => {
    try {
        const { narration, currency, amount } = req.body;

        // Fetch user and payout information
        const user = await User.findOne({ email: req.body.email });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const payoutDetails = await UserPayout.findOne({ email: user.email });
        if (!payoutDetails) return res.status(404).json({ error: 'Payout details not found' });

        // Calculate updated balance
        const updatedBalance = user.balance - amount;
        if (updatedBalance < 0) return res.status(400).json({ error: 'Insufficient balance' });

        // Create a new transaction
        const transaction = new Transactions({
            email: user.email,
            narration,
            credit: 0,
            debit: amount,
            amount,
            currency,
            balance: updatedBalance,
            status: 'PENDING',
        });
        await transaction.save();

        res.status(201).json({ message: 'Transaction initiated successfully', transaction });
    } catch (error) {
        console.error('Error initiating transaction:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to approve or reject a transaction
router.post('/approvePaypalTransaction/:id', checkToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { approved, adminComments } = req.body;

        const transactionApproval = new TransactionApproval({
            transactionId: id,
            approved,
            adminComments,
        });
        await transactionApproval.save();

        const transaction = await Transactions.findById(id);
        if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

        if (approved) {
            transaction.status = 'APPROVED';
            await transaction.save();

            // Get Access Token
            const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
            const tokenResponse = await fetch(process.env.PAYPAL_OAUTH_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'grant_type=client_credentials'
            });

            if (!tokenResponse.ok) {
                const error = await tokenResponse.json();
                return res.status(500).json({ error });
            }

            const tokenData = await tokenResponse.json();
            const accessToken = tokenData.access_token;

            // Create Payout
            const payoutData = {
                sender_batch_header: {
                    sender_batch_id: `batch_${Date.now()}`,
                    email_subject: "You have a payout!",
                    email_message: "You have received a payout! Thanks for using our service!"
                },
                items: [
                    {
                        recipient_type: "EMAIL",
                        amount: {
                            value: transaction.amount,
                            currency: transaction.currency
                        },
                        note: transaction.narration,
                        sender_item_id: `item_${Date.now()}`,
                        receiver: transaction.email
                    }
                ]
            };

            const payoutResponse = await fetch(process.env.PAYPAL_PAYOUTS_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payoutData)
            });

            if (!payoutResponse.ok) {
                const error = await payoutResponse.json();
                return res.status(500).json({ error });
            }

            const payoutResult = await payoutResponse.json();
            res.status(200).json({ message: 'Payout successful', payoutResult });
        } else {
            transaction.status = 'REJECTED';
            await transaction.save();
            res.status(200).json({ message: 'Transaction rejected' });
        }
    } catch (error) {
        console.error('Error approving transaction:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/exchange-rate', checkToken, async (req, res) => {
    const { amount, currency } = req.query;

    if (!amount || !currency) {
        return res.status(400).json({ error: 'Missing amount or currency' });
    }

    try {
        // Validate amount and currency
        if (isNaN(amount) || !currency.match(/^[A-Z]{3}$/)) {
            return res.status(400).json({ error: 'Invalid amount or currency format' });
        }

        const response = await fetch(`https://api.flutterwave.com/v3/transfers/rates?amount=${amount}&destination_currency=${currency}&source_currency=USD`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            return res.status(response.status).json({ error });
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/PaypalPayoutDetails', checkToken, async (req, res) => {
    try {
        const { email, beneficiary_name, currency } = req.body;

        // Check if a payout with the same email already exists
        /*const existingPayout = await UserPayout.findOne({ email });
        if (existingPayout) {
            return res.status(400).json({ message: 'Payout details for this email already exist.' });
        }
        */
        const payout = new UserPayout({
            email,
            beneficiary_name,
            currency
        });

        await payout.save();
        res.status(201).json(payout);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});

// Endpoint to read PayPal payout details
router.get('/PaypalPayoutDetails/:email', checkToken, async (req, res) => {
    try {
        const { email } = req.params;

        const payout = await UserPayout.findOne({ email });
        if (!payout) {
            return res.status(404).json({ message: 'Payout details not found.' });
        }

        res.status(200).json(payout);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});

// Endpoint to update PayPal payout details
router.put('/PaypalPayoutDetails/:id/:email', checkToken, async (req, res) => {
    try {
        const { id, email } = req.params;
        const { beneficiary_name, currency } = req.body;

        const updatedPayout = await UserPayout.findOneAndUpdate(
            { _id: id, email },
            { beneficiary_name, currency },
            { new: true, runValidators: true }
        );

        if (!updatedPayout) {
            return res.status(404).json({ message: 'Payout details not found.' });
        }

        res.status(200).json(updatedPayout);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});

// Endpoint to delete PayPal payout details
router.delete('/PaypalPayoutDetails/:id/:email', checkToken, async (req, res) => {
    try {
        const { id, email } = req.params;

        const deletedPayout = await UserPayout.findOneAndDelete({ _id: id, email });
        if (!deletedPayout) {
            return res.status(404).json({ message: 'Payout details not found.' });
        }

        res.status(200).json({ message: 'Payout details deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error });
    }
});



module.exports = router;
