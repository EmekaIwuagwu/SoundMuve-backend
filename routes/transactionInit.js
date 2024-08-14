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

router.post('/initiate', async (req, res) => {
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
// Route to approve a transaction
router.post('/approve/:transactionId', async (req, res) => {
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


module.exports = router;
