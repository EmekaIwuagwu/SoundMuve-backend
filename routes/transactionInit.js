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

// Route to initiate a transaction
router.post('/initiate', async (req, res) => {
    const { email, narration, amount, currency } = req.body;

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
        res.status(500).json({ message: error.message });
    }
});

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
                        account_bank: payout.account_bank,
                        account_number: payout.account_number,
                        amount: transaction.amount,
                        narration: transaction.narration,
                        currency: 'USD',
                        beneficiary_name: payout.beneficiary_name,
                        meta: {
                            beneficiary_name: payout.beneficiary_name,
                            beneficiary_address: payout.beneficiary_address,
                            beneficiary_country: payout.beneficiary_country
                        }
                    };
                    break;
                case 'EUR':
                    transferData = {
                        account_bank: payout.account_bank,
                        account_number: payout.account_number,
                        amount: transaction.amount,
                        narration: transaction.narration,
                        currency: 'EUR',
                        beneficiary_name: payout.beneficiary_name,
                        meta: {
                            beneficiary_name: payout.beneficiary_name,
                            beneficiary_country: payout.beneficiary_country,
                            postal_code: payout.postal_code,
                            street_number: payout.street_number,
                            street_name: payout.street_name,
                            city: payout.city
                        }
                    };
                    break;
                case 'NGN': // Already working fine, included for completeness
                    transferData = {
                        account_bank: payout.account_bank,
                        account_number: payout.account_number,
                        amount: transaction.amount,
                        narration: transaction.narration,
                        currency: 'NGN',
                    };
                    break;
                case 'GHS':
                case 'TZS':
                case 'UGX':
                    transferData = {
                        account_bank: payout.account_bank,
                        account_number: payout.account_number,
                        amount: transaction.amount,
                        narration: transaction.narration,
                        currency: transaction.currency,
                        destination_branch_code: payout.destination_branch_code,
                        beneficiary_name: payout.beneficiary_name
                    };
                    break;
                case 'XAF':
                case 'XOF':
                    transferData = {
                        account_bank: payout.account_bank,
                        account_number: payout.account_number,
                        beneficiary_name: payout.beneficiary_name,
                        amount: transaction.amount,
                        narration: transaction.narration,
                        currency: transaction.currency,
                        debit_currency: payout.debit_currency,
                        destination_branch_code: payout.destination_branch_code
                    };
                    break;
                default:
                    return res.status(400).json({ message: 'Unsupported currency.' });
            }

            try {
                // Call Flutterwave API to initiate the payout using node-fetch
                const response = await fetch(FLUTTERWAVE_API_URL, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${process.env.SECRET_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(transferData)
                });

                const responseData = await response.json();
                console.log('Flutterwave API Response:', responseData); // Debug log

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
        res.status(500).json({ message: error.message });
    }
});
module.exports = router;
