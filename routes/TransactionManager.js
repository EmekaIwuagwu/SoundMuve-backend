const router = require("express").Router();
const User = require("../models/User");
const Trans = require("../models/Transactions");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

router.get("/wallet-transfer", async (req, res) => {
    try {
        // Check for authorization token
        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        // Parse transfer amount
        const amount = parseInt(req.query.amount);
        if (isNaN(amount)) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        // Debit user
        const debitUser = await User.findOne({ email: req.query.transferfrom });
        if (!debitUser) {
            return res.status(404).json({ message: "Debiting user not found" });
        }
        const debit_balance = parseInt(debitUser.balance);
        if (debit_balance < amount) {
            return res.status(400).json({ message: "Insufficient balance" });
        }
        const debit_amt = debit_balance - amount;
        await User.findOneAndUpdate(
            { email: req.query.transferfrom },
            { $set: { balance: debit_amt } }
        );

        const debitTransaction = new Trans({
            email: req.query.transferfrom,
            narration: `DEBIT Wallet Transfer - ${amount}`,
            credit: 0.0,
            debit: amount,
            amount: amount,
        });
        await debitTransaction.save();

        // Credit user
        const creditUser = await User.findOne({ email: req.query.transferTo });
        if (!creditUser) {
            return res.status(404).json({ message: "Crediting user not found" });
        }
        const credit_balance = parseInt(creditUser.balance);
        const credit_amt = credit_balance + amount;
        await User.findOneAndUpdate(
            { email: req.query.transferTo },
            { $set: { balance: credit_amt } }
        );

        const creditTransaction = new Trans({
            email: req.query.transferTo,
            narration: `CREDIT Wallet Transfer - ${amount}`,
            credit: amount,
            debit: 0.0,
            amount: amount,
        });
        await creditTransaction.save();

        return res.send({
            error: false,
            message: "Wallet Transfer Complete",
            debit: {
                email: req.query.transferfrom,
                updated_balance: debit_amt,
                transaction: debitTransaction
            },
            credit: {
                email: req.query.transferTo,
                updated_balance: credit_amt,
                transaction: creditTransaction
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get("/get-transactionby-email/:email", async (req, res) => {
    try {
        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }
        const trans = await Trans.find({ email: req.params.email }).sort({ created_at: -1 });
        res.status(200).json(trans);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

router.get("/get-credit-transaction/:email", async (req, res) => {
    try {
        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }
        const trans = await Trans.find(
            { email: req.params.email, debit: 0.00 },
            { narration: true, credit: true, amount: true }
        ).sort({ created_at: -1 });
        res.status(200).json(trans);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

router.get("/get-debit-transaction/:email", async (req, res) => {
    try {
        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }
        const trans = await Trans.find(
            { email: req.params.email, credit: 0.00 },
            { narration: true, debit: true, amount: true }
        ).sort({ created_at: -1 });
        res.status(200).json(trans);
    } catch (error) {
        res.status(404).json({ message: error.message });
    }
});

router.get('/check-transactions', async (req, res) => {
    try {

        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        // Extract the start date and end date from the query parameters
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: "Please provide both startDate and endDate" });
        }

        // Convert the start and end dates to Date objects
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Validate the dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }

        // Query the database for transactions within the date range
        const transactions = await Transactions.find({
            created_at: {
                $gte: start,
                $lte: end
            }
        });

        // Return the transactions
        res.send(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;