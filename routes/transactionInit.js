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
            const payout = await UserPayout.findOne({ email: transaction.email, currency: transaction.currency });
            if (!payout) {
                return res.status(404).json({ message: 'Payout information not found for the specified currency.' });
            }

            let transferData = {};
            let retryEndpoint = '';

            switch (transaction.currency) {
                case 'USD':
                    transferData = {
                        amount: transaction.amount,
                        narration: transaction.narration,
                        currency: 'USD',
                        beneficiary_name: payout.beneficiary_name,
                        meta: {
                            account_number: payout.account_number,
                            routing_number: payout.routing_number || '',
                            swift_code: payout.swift_code || '',
                            bank_name: payout.bank_name || '',
                            beneficiary_name: payout.beneficiary_name,
                            beneficiary_address: payout.beneficiary_address || '',
                            beneficiary_country: payout.beneficiary_country || ''
                        }
                    };
                    retryEndpoint = 'https://soundmuve-backend-zrap.onrender.com/api/payouts/us-transfer';
                    break;

                case 'EUR':
                    transferData = {
                        amount: transaction.amount,
                        narration: transaction.narration,
                        currency: 'EUR',
                        beneficiary_name: payout.beneficiary_name,
                        meta: {
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
                    };
                    retryEndpoint = 'https://soundmuve-backend-zrap.onrender.com/api/payouts/euro-payments';
                    break;

                // Handle other currencies (already working fine)
                case 'NGN': // Included for completeness
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
                        destination_branch_code: payout.destination_branch_code || '',
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
                        debit_currency: payout.debit_currency || '',
                        destination_branch_code: payout.destination_branch_code || ''
                    };
                    break;

                default:
                    return res.status(400).json({ message: 'Unsupported currency.' });
            }

            try {
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
                console.log('Flutterwave API Response:', responseData);

                if (responseData.status === 'success') {
                    transaction.status = 'Completed';
                    await transaction.save();

                    await TransactionApproval.create({
                        transactionId,
                        approved: true,
                        adminComments
                    });

                    res.status(200).json({ message: 'Transaction approved and payout initiated.', response: responseData });
                } else {
                    console.error('Failed to initiate payout:', responseData.message);

                    // Retry the payment using fallback endpoint
                    const retryResponse = await retryPayment(retryEndpoint, transferData, process.env.JWT_TOKEN);
                    if (retryResponse.status === 'success') {
                        transaction.status = 'Completed';
                        await transaction.save();

                        await TransactionApproval.create({
                            transactionId,
                            approved: true,
                            adminComments
                        });

                        res.status(200).json({ message: 'Transaction approved and payout initiated via retry endpoint.', response: retryResponse });
                    } else {
                        res.status(400).json({
                            message: 'Failed to initiate payout after retry.',
                            error: retryResponse.message || 'Unknown error',
                            response: retryResponse
                        });
                    }
                }
            } catch (apiError) {
                console.error('Flutterwave API Error:', apiError);
                res.status(500).json({ message: 'Error communicating with payment gateway.', error: apiError.message });
            }
        } else {
            transaction.status = 'Rejected';
            await transaction.save();

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
