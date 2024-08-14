// routes/transaction.js
require('dotenv').config()
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transactions = require('../models/Transactions');
const UserPayout = require('../models/UserPayout');
const TransactionApproval = require('../models/transactionApproval');
const axios = require('axios');

const FLUTTERWAVE_API_URL = 'https://api.flutterwave.com/v3/transfers';

router.post('/initiate', async (req, res) => {
    const { email, narration, amount } = req.body;

    if (!email || !narration || !amount) {
        return res.status(400).json({ message: 'Email, narration, and amount are required.' });
    }

    try {
        // Find the user and their balance
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Find the payout information
        const payout = await UserPayout.findOne({ email });
        if (!payout) {
            return res.status(404).json({ message: 'Payout information not found.' });
        }

        // Create a new transaction with status "Pending"
        const transaction = new Transactions({
            email,
            narration,
            credit: 0,
            debit: amount,
            amount,
            currency: payout.currency,
            status: 'Pending',
            balance: user.balance - amount,
        });

        await transaction.save();
        res.status(201).json({ message: 'Transaction initiated and saved for approval.', transaction });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


router.post('/approve/:transactionId', async (req, res) => {
    const { transactionId } = req.params;
    const { approved, adminComments } = req.body;

    try {
        const transaction = await Transactions.findById(transactionId);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found.' });
        }

        if (approved) {
            // Fetch user payout information
            const payout = await UserPayout.findOne({ email: transaction.email });
            if (!payout) {
                return res.status(404).json({ message: 'Payout information not found.' });
            }

            // Prepare Flutterwave request data
            let transferData = {};
            switch (payout.currency) {
                case 'USD':
                    transferData = {
                        email: transaction.email,
                        amount: transaction.amount,
                        narration: transaction.narration,
                        currency: 'USD',
                        beneficiary_name: payout.beneficiary_name,
                        meta: [{
                            account_number: payout.account_number,
                            routing_number: payout.routing_number,
                            swift_code: payout.swift_code,
                            bank_name: payout.bank_name,
                            beneficiary_name: payout.beneficiary_name,
                            beneficiary_address: payout.beneficiary_address,
                            beneficiary_country: payout.beneficiary_country
                        }]
                    };
                    break;
                case 'EUR':
                    transferData = {
                        email: transaction.email,
                        amount: transaction.amount,
                        narration: transaction.narration,
                        currency: 'EUR',
                        beneficiary_name: payout.beneficiary_name,
                        meta: [{
                            account_number: payout.account_number,
                            routing_number: payout.routing_number,
                            swift_code: payout.swift_code,
                            bank_name: payout.bank_name,
                            beneficiary_name: payout.beneficiary_name,
                            beneficiary_country: payout.beneficiary_country,
                            postal_code: payout.postal_code,
                            street_number: payout.street_number,
                            street_name: payout.street_name,
                            city: payout.city
                        }]
                    };
                    break;
                case 'NGN':
                    transferData = {
                        email: transaction.email,
                        account_bank: payout.account_bank,
                        account_number: payout.account_number,
                        amount: transaction.amount,
                        narration: transaction.narration
                    };
                    break;
                case 'GHS':
                case 'TZS':
                case 'UGX':
                    transferData = {
                        email: transaction.email,
                        account_bank: payout.account_bank,
                        account_number: payout.account_number,
                        amount: transaction.amount,
                        narration: transaction.narration,
                        currency: payout.currency,
                        destination_branch_code: payout.destination_branch_code,
                        beneficiary_name: payout.beneficiary_name
                    };
                    break;
                case 'XAF':
                case 'XOF':
                    transferData = {
                        email: transaction.email,
                        account_bank: payout.account_bank,
                        account_number: payout.account_number,
                        beneficiary_name: payout.beneficiary_name,
                        amount: transaction.amount,
                        narration: transaction.narration,
                        currency: payout.currency,
                        debit_currency: payout.debit_currency,
                        destination_branch_code: payout.destination_branch_code
                    };
                    break;
                default:
                    return res.status(400).json({ message: 'Unsupported currency.' });
            }

            // Call Flutterwave API to initiate the payout
            const response = await axios.post(FLUTTERWAVE_API_URL, transferData, {
                headers: {
                    Authorization: `Bearer ${process.env.SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.status === 'success') {
                // Update transaction status to "Completed"
                transaction.status = 'Completed';
                await transaction.save();

                // Save approval record
                await TransactionApproval.create({
                    transactionId,
                    approved: true,
                    adminComments
                });

                res.status(200).json({ message: 'Transaction approved and payout initiated.', response: response.data });
            } else {
                res.status(400).json({ message: 'Failed to initiate payout.', response: response.data });
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
