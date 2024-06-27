const router = require("express").Router();
const User = require("../models/User");
const Trans = require("../models/Transactions");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;
const nodemailer = require("nodemailer");
const { createObjectCsvWriter } = require('csv-writer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});


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
        // Extract the start date, end date, and email from the query parameters
        const { startDate, endDate, email } = req.query;

        if (!startDate || !endDate || !email) {
            return res.status(400).json({ message: "Please provide startDate, endDate, and email" });
        }

        // Convert the start and end dates to Date objects
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Validate the dates
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }

        // Query the database for transactions within the date range and matching email
        const transactions = await Trans.find({
            email: email,
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


const generatePDF = async (transactions, filePath) => {
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(filePath));

    doc.text('Transactions Report', { align: 'center', underline: true });
    doc.moveDown();

    // Fetch user balances
    const userEmails = transactions.map(transaction => transaction.email);
    const userBalances = await User.find({ email: { $in: userEmails } }).select('email balance');

    transactions.forEach(transaction => {
        const userBalance = userBalances.find(user => user.email === transaction.email).balance;

        doc.text(`Date: ${transaction.created_at}`);
        doc.text(`Narration: ${transaction.narration}`);
        doc.text(`Credit: ${transaction.credit}`);
        doc.text(`Debit: ${transaction.debit}`);
        doc.text(`Amount: ${transaction.amount}`);
        doc.text(`Balance: ${userBalance}`); // Include balance
        doc.moveDown();
    });

    doc.end();
};

// Helper function to generate CSV
const generateCSV = async (transactions, filePath) => {
    const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
            { id: 'created_at', title: 'Date' },
            { id: 'narration', title: 'Narration' },
            { id: 'credit', title: 'Credit' },
            { id: 'debit', title: 'Debit' },
            { id: 'amount', title: 'Amount' },
            { id: 'balance', title: 'Balance' }, // Add balance header
        ],
    });

    // Fetch user balances
    const userEmails = transactions.map(transaction => transaction.email);
    const userBalances = await User.find({ email: { $in: userEmails } }).select('email balance');

    const records = transactions.map(transaction => {
        const userBalance = userBalances.find(user => user.email === transaction.email).balance;

        return {
            email: transaction.email,
            narration: transaction.narration,
            credit: transaction.credit,
            debit: transaction.debit,
            amount: transaction.amount,
            balance: userBalance, // Include balance in each record
            created_at: transaction.created_at,
        };
    });

    await csvWriter.writeRecords(records);
};

router.get('/export-transactions', async (req, res) => {
    try {
        const { startDate, endDate, email, format } = req.query;

        if (!startDate || !endDate || !email || !format) {
            return res.status(400).json({ message: "Please provide startDate, endDate, email, and format (pdf or xls)" });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }

        const transactions = await Trans.find({
            email: email,
            created_at: {
                $gte: start,
                $lte: end,
            },
        });

        if (transactions.length === 0) {
            return res.status(404).json({ message: "No transactions found" });
        }

        const filePath = path.join(__dirname, `../temp/transactions.${format}`);

        if (format === 'pdf') {
            await generatePDF(transactions, filePath); // Await for PDF generation
        } else if (format === 'xls') {
            await generateCSV(transactions, filePath); // Await for CSV generation
        } else {
            return res.status(400).json({ message: "Invalid format. Use 'pdf' or 'xls'" });
        }

        cloudinary.uploader.upload(filePath, { resource_type: "raw" }, (error, result) => {
            if (error) {
                return res.status(500).json({ message: error.message });
            }

            fs.unlinkSync(filePath); // Delete the local file after upload

            res.send({
                error: false,
                message: "Transactions exported successfully",
                fileUrl: result.secure_url,
            });
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;