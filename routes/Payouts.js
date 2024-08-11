require('dotenv').config()
const router = require("express").Router();
const fetch = require("node-fetch");
const User = require("../models/User");
const Trans = require("../models/Transactions");
const UserPayout = require('../models/UserPayout');

router.post("/local-transfer", async (req, res, next) => {
    try {
        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        function generateReferenceCode() {
            const prefix = 'akhlm-pstmnpyt-rfxx';
            const suffix = '_PMCKDU_';

            const randomThreeDigits = Math.floor(100 + Math.random() * 900).toString();
            const randomSevenDigits = Math.floor(1000000 + Math.random() * 9000000).toString();
            const result = `${prefix}${randomThreeDigits}${suffix}${randomSevenDigits}`;

            return result;
        }

        const ref = generateReferenceCode();
        const debit_currency = "NGN";
        const currency = debit_currency;

        const { account_bank, account_number, email, amount, narration } = req.body;

        const debit = await User.findOne({ email });
        const my_bal = parseInt(debit.balance);

        if (my_bal < amount) {
            return res.status(403).json({ message: "Insufficient Balance" });
        } else {
            const url = "https://api.flutterwave.com/v3/transfers";
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-type": "application/json",
                    Authorization: `Bearer ${process.env.SECRET_KEY}`,
                },
                body: JSON.stringify({
                    account_bank,
                    account_number,
                    amount,
                    narration,
                    currency,
                    ref,
                    debit_currency,
                }),
            });

            const json = await response.json();
            if (json.status !== "success") {
                return res.status(500).json({ message: "Transfer failed", data: json });
            }

            const debit_balance = parseInt(debit.balance);
            const debit_amt = debit_balance - amount;

            await User.findOneAndUpdate(
                { email },
                { $set: { balance: debit_amt } }
            );

            const transactions = new Trans({
                email,
                narration,
                credit: 0.0,
                debit: amount,
                currency,
                amount,
                balance: debit_amt,
            });

            await transactions.save();
            console.log("Transaction saved");

            return res.json({ error: false, data: json, message: "OK" });
        }
    } catch (err) {
        next(err);
    }
});

router.post("/us-transfer", async (req, res, next) => {
    try {
        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const {
            email,
            amount,
            narration,
            currency,
            beneficiary_name,
            AccountNumber,
            RoutingNumber,
            SwiftCode,
            BankName,
            BeneficiaryAddress,
            BeneficiaryCountry
        } = req.body;

        const source_currency = "NGN";
        const header = {
            Accept: "application/json",
            "Content-type": "application/json",
            Authorization: `Bearer ${process.env.SECRET_KEY}`,
        };

        const url = `https://api.flutterwave.com/v3/transfers/rates?amount=${amount}&destination_currency=${currency}&source_currency=${source_currency}`;
        const response = await fetch(url, { method: "GET", headers: header });
        const responseJson = await response.json();

        if (responseJson.message !== "Transfer amount fetched") {
            return res.status(500).json({ message: "Failed to fetch transfer amount" });
        }

        const output_amount = responseJson.data.source.amount;

        const transferUrl = "https://api.flutterwave.com/v3/transfers";
        const transferResponse = await fetch(transferUrl, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-type": "application/json",
                Authorization: `Bearer ${process.env.SECRET_KEY}`,
            },
            body: JSON.stringify({
                amount: output_amount,
                narration,
                currency,
                beneficiary_name,
                meta: [
                    {
                        AccountNumber,
                        RoutingNumber,
                        SwiftCode,
                        BankName,
                        BeneficiaryName: beneficiary_name,
                        BeneficiaryAddress,
                        BeneficiaryCountry,
                    },
                ],
            }),
        });

        const json = await transferResponse.json();
        if (json.status !== "success") {
            return res.status(500).json({ message: "Transfer failed", data: json });
        }

        const debit = await User.findOne({ email });
        const debit_balance = debit.balance;
        const debit_amt = debit_balance - output_amount;
        await User.findOneAndUpdate(
            { email },
            { $set: { balance: debit_amt } }
        );

        const transactions = new Trans({
            email,
            narration,
            credit: 0.0,
            debit: amount,
            currency,
            amount,
            balance: debit_amt,
        });

        await transactions.save();
        console.log("Transaction saved");

        return res.json({ error: false, data: json, message: "OK" });
    } catch (err) {
        next(err);
    }
});


router.post("/euro-payments", async (req, res, next) => {

    try {

        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const { currency } = req.body;

        if (currency == "GBP") {
            await handleGBPPayments(req, res, next);

        } else if (currency == "EUR") {
            await handleEURPayment(req, res, next);
        }

    } catch (err) {
        next(err);
    }

});


router.post("/afro-payments", async (req, res, next) => {
    try {
        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const { currency } = req.body;

        if (currency === "GHS" || currency === "UGX") {
            await handleGHSUGXPayment(req, res, next);
        } else if (currency === "XAF" || currency === "XOF") {
            await handleXAFXOFPayment(req, res, next);
        } else if (currency == "ZAR") {
            await handleZARPayments(req, res, next);
        } else if (currency == "KES") {
            await handleKESPayments(req, res, next);
        }else if (currency == "XOF" || currency =="XAF") {
            await handleXAFXOFPayment(req, res, next);
        } else {
            res.status(400).json({ message: "Invalid currency" });
        }
    } catch (err) {
        next(err);
    }
});

const handleEURPayment = async (req, res, next) => {
    try {
        const url = "https://api.flutterwave.com/v3/transfers";
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.SECRET_KEY}`,
            },
            body: JSON.stringify({
                amount: req.body.amount,
                narration: req.body.narration,
                currency: "EUR",
                beneficiary_name: req.body.beneficiary_name,
                meta: req.body.meta,
            }),
        });

        const json = await response.json();
        if (json.status !== "success") {
            return res.status(500).json({ message: "Transfer failed", data: json });
        }

        return res.json({ error: false, data: json, message: "Transfer successful" });
    } catch (err) {
        next(err);
    }
};

// Function to handle GBP payments
const handleGBPPayments = async (req, res, next) => {
    try {
        const url = "https://api.flutterwave.com/v3/transfers";
        const response = await fetch(url, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.SECRET_KEY}`,
            },
            body: JSON.stringify({
                amount: req.body.amount,
                narration: req.body.narration,
                currency: "GBP",
                beneficiary_name: req.body.beneficiary_name,
                meta: req.body.meta,
            }),
        });

        const json = await response.json();
        if (json.status !== "success") {
            return res.status(500).json({ message: "Transfer failed", data: json });
        }

        return res.json({ error: false, data: json, message: "Transfer successful" });
    } catch (err) {
        next(err);
    }
};


const handleGHSUGXPayment = async (req, res, next) => {
    try {
        const { account_bank, account_number, email, amount, narration, currency, destination_branch_code, beneficiary_name, debit_currency } = req.body;

        const debit = await User.findOne({ email });
        const my_bal = parseInt(debit.balance);

        if (my_bal < amount) {
            return res.status(403).json({ message: "Insufficient Balance" });
        } else {
            const url = "https://api.flutterwave.com/v3/transfers";
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-type": "application/json",
                    Authorization: `Bearer ${process.env.SECRET_KEY}`,
                },
                body: JSON.stringify({
                    account_bank,
                    account_number,
                    amount,
                    narration,
                    currency,
                    destination_branch_code,
                    beneficiary_name,
                    debit_currency,
                }),
            });

            const json = await response.json();
            if (json.status !== "success") {
                return res.status(500).json({ message: "Transfer failed", data: json });
            }

            const debit_balance = parseInt(debit.balance);
            const debit_amt = debit_balance - amount;

            await User.findOneAndUpdate(
                { email },
                { $set: { balance: debit_amt } }
            );

            const transactions = new Trans({
                email,
                narration,
                credit: 0.0,
                debit: amount,
                amount,
                currency,
                balance: debit_amt,
            });

            await transactions.save();
            console.log("Transaction saved");

            return res.json({ error: false, data: json, message: "OK" });
        }
    } catch (err) {
        next(err);
    }
};

const handleXAFXOFPayment = async (req, res, next) => {
    try {
        const { account_bank, account_number, email, amount, narration, currency, reference, debit_currency, beneficiary_name } = req.body;

        const debit = await User.findOne({ email });

        if (!debit) {
            return res.status(404).json({ message: "User not found" });
        }

        const my_bal = parseInt(debit.balance);

        if (my_bal < amount) {
            return res.status(403).json({ message: "Insufficient Balance" });
        } else {
            const url = "https://api.flutterwave.com/v3/transfers";
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-type": "application/json",
                    Authorization: `Bearer ${process.env.SECRET_KEY}`,
                },
                body: JSON.stringify({
                    email,
                    account_bank,
                    account_number,
                    amount,
                    narration,
                    currency,
                    reference,
                    debit_currency,
                    beneficiary_name
                }),
            });

            const json = await response.json();
            if (json.status !== "success") {
                return res.status(500).json({ message: "Transfer failed", data: json });
            }

            const debit_balance = parseInt(debit.balance);
            const debit_amt = debit_balance - amount;

            await User.findOneAndUpdate(
                { email },
                { $set: { balance: debit_amt } }
            );

            const transactions = new Trans({
                email,
                narration,
                credit: 0.0,
                debit: amount,
                amount,
                currency,
                balance: debit_amt,
            });

            await transactions.save();
            console.log("Transaction saved");

            return res.json({ error: false, data: json, message: "OK" });
        }
    } catch (err) {
        next(err);
    }
};



const handleZARPayments = async (req, res, next) => {
    try {
        const { account_bank, account_number, email, amount, narration, currency, reference, debit_currency } = req.body;

        const debit = await User.findOne({ email });
        const my_bal = parseInt(debit.balance);

        if (my_bal < amount) {
            return res.status(403).json({ message: "Insufficient Balance" });
        } else {
            const url = "https://api.flutterwave.com/v3/transfers";
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-type": "application/json",
                    Authorization: `Bearer ${process.env.SECRET_KEY}`,
                },
                body: JSON.stringify({
                    account_bank,
                    account_number,
                    amount,
                    narration,
                    currency,
                    reference,
                    debit_currency,
                }),
            });

            const json = await response.json();
            if (json.status !== "success") {
                return res.status(500).json({ message: "Transfer failed", data: json });
            }

            const debit_balance = parseInt(debit.balance);
            const debit_amt = debit_balance - amount;

            await User.findOneAndUpdate(
                { email },
                { $set: { balance: debit_amt } }
            );

            const transactions = new Trans({
                email,
                narration,
                credit: 0.0,
                debit: amount,
                amount,
                currency,
                balance: debit_amt,
            });

            await transactions.save();
            console.log("Transaction saved");

            return res.json({ error: false, data: json, message: "OK" });
        }
    } catch (err) {
        next(err);
    }
};

const handleKESPayments = async (req, res, next) => {
    try {
        const { email, amount, narration, currency, beneficiary_name, beneficiary_mobile_number, sender } = req.body;

        const debit = await User.findOne({ email });
        const my_bal = parseInt(debit.balance);

        if (my_bal < amount) {
            return res.status(403).json({ message: "Insufficient Balance" });
        } else {
            const url = "https://api.flutterwave.com/v3/transfers";
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-type": "application/json",
                    Authorization: `Bearer ${process.env.SECRET_KEY}`,
                },
                body: JSON.stringify({
                    amount,
                    narration,
                    currency,
                    beneficiary_name,
                    destination_branch_code: beneficiary_mobile_number,
                    debit_currency: "NGN",
                    meta: [
                        {
                            mobile_number: beneficiary_mobile_number,
                            sender,
                        },
                    ],
                }),
            });

            const json = await response.json();
            if (json.status !== "success") {
                return res.status(500).json({ message: "Transfer failed", data: json });
            }

            const debit_balance = parseInt(debit.balance);
            const debit_amt = debit_balance - amount;

            await User.findOneAndUpdate(
                { email },
                { $set: { balance: debit_amt } }
            );

            const transactions = new Trans({
                email,
                narration,
                credit: 0.0,
                debit: amount,
                amount,
                currency,
                balance: debit_amt,
            });

            await transactions.save();
            console.log("Transaction saved");

            return res.json({ error: false, data: json, message: "OK" });
        }
    } catch (err) {
        next(err);
    }
};

router.get('/banks/:country', async (req, res) => {

    if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ") ||
        !req.headers.authorization.split(" ")[1]
    ) {
        return res.status(422).json({ message: "Please Provide Token!" });
    }

    const { country } = req.params;

    if (!country) {
        return res.status(400).json({ message: 'Country parameter is required' });
    }

    try {
        const response = await fetch(`https://api.flutterwave.com/v3/banks/${country}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error: ${response.statusText}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/payout-details', async (req, res) => {
    try {

        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const { fullName, bankName, accountNumber, routingNumber, email } = req.body;

        if (!fullName || !bankName || !accountNumber || !email) {
            return res.status(400).json({ message: "Full name, bank name, account number, and email are required!" });
        }

        const newPayout = new UserPayout({ fullName, bankName, accountNumber, routingNumber, email });
        await newPayout.save();

        res.status(201).json({ message: "Payout details created successfully", payout: newPayout });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Update Payout Details
router.put('/payout-details/:id', async (req, res) => {
    try {

        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const { id } = req.params;
        const { email, fullName, bankName, accountNumber, routingNumber } = req.body;

        if (!email || !id) {
            return res.status(400).json({ message: "Email and ID are required!" });
        }

        const updatedPayout = await UserPayout.findOneAndUpdate(
            { _id: id, email: email },
            { fullName, bankName, accountNumber, routingNumber },
            { new: true }
        );

        if (!updatedPayout) {
            return res.status(404).json({ message: "Payout details not found!" });
        }

        res.status(200).json({ message: "Payout details updated successfully", payout: updatedPayout });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete Payout Details
router.delete('/payout-details/:id', async (req, res) => {
    try {

        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const { id } = req.params;
        const { email } = req.body;

        if (!email || !id) {
            return res.status(400).json({ message: "Email and ID are required!" });
        }

        const deletedPayout = await UserPayout.findOneAndDelete({ _id: id, email: email });

        if (!deletedPayout) {
            return res.status(404).json({ message: "Payout details not found!" });
        }

        res.status(200).json({ message: "Payout details deleted successfully" });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Show Payout Details
router.get('/payout-details', async (req, res) => {
    try {

        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ message: "Email is required!" });
        }

        const payoutDetails = await UserPayout.find({ email: email });

        if (payoutDetails.length === 0) {
            return res.status(404).json({ message: "No payout details found for this email!" });
        }

        res.status(200).json({ message: "Payout details retrieved", payouts: payoutDetails });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: error.message });
    }
});


router.post('/resolve-account', async (req, res) => {
    const { account_number, account_bank } = req.body;

    console.log('Received request body:', req.body);

    if (!account_number || !account_bank) {
        return res.status(400).json({ error: 'account_number and account_bank are required' });
    }

    try {
        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }
        
        const response = await fetch('https://api.flutterwave.com/v3/accounts/resolve', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ account_number, account_bank }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json(errorData);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error resolving account:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/resolveTransactionStatus', async (req, res) => {
    const { id } = req.query; // Change to req.query to match GET request conventions

    console.log('Received request query:', req.query);

    if (!id) {
        return res.status(400).json({ error: 'Transaction Id is required' });
    }

    try {
        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const response = await fetch(`https://api.flutterwave.com/v3/transactions/${id}/verify`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${process.env.SECRET_KEY}`, // Use the secret key from environment variables
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: `Error verifying transaction: ${response.statusText}` });
        }

        const data = await response.json();

        res.status(200).json({ message: "Transaction Retrieved", transaction: data });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
