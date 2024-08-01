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

        // Fetch user balance
        const user = await User.findOne({ email: req.params.email }, 'balance');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Fetch transactions
        const trans = await Trans.find({ email: req.params.email }).sort({ created_at: -1 });

        // Combine balance with transactions
        const response = {
            balance: user.balance,
            transactions: trans
        };

        res.status(200).json(response);
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

const fetchUserBalance = async (email) => {
    const user = await User.findOne({ email: email });
    return user ? user.balance : 0;
};

const generatePDF = async (transactions, balance, filePath) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Set up fonts and styles
    doc.font('Helvetica-Bold').fontSize(8);

    // Title
    doc.text('Transactions Report', { align: 'center', underline: true });
    doc.moveDown();

    // Table headers
    const headers = ['Date', 'Narration', 'Credit', 'Debit', 'Amount', 'Balance'];

    // Draw table headers
    let yPos = doc.y;
    let xPos = 50; // Start position for first header
    let headerWidths = []; // Array to store the widths of each header
    headers.forEach((header) => {
        doc.text(header, xPos, yPos);
        const width = doc.widthOfString(header) + 10; // Calculate width of string and add padding
        headerWidths.push(width); // Store the width of the header
        xPos += width; // Increment x-position by width for next header
    });

    // Draw table rows
    transactions.forEach((transaction, j) => {
        const row = [
            new Date(transaction.created_at).toLocaleDateString('en-US'), // Format date as 'mm-dd-yyyy'
            transaction.narration,
            transaction.credit.toFixed(2) === '0.00' ? '' : transaction.credit.toFixed(2), // If credit is 0.00, leave it as blank
            transaction.debit.toFixed(2) === '0.00' ? '' : transaction.debit.toFixed(2), // If debit is 0.00, leave it as blank
            transaction.amount.toFixed(2),
            balance.toFixed(2), // Add balance to the row
        ];
        yPos = doc.y + 15 * (j + 1); // Adjust y position for each row
        xPos = 50; // Reset x-position for the start of each row
        row.forEach((cell, i) => {
            if (i === 1) { // If 'Narration' column
                const text = doc.text(cell, xPos, yPos, { width: 200, align: 'left' }); // Increase the width to 200
                const lineHeight = text.currentLineHeight();
                const textLines = Math.ceil(text.widthOfString(cell) / 200);
                yPos += textLines * lineHeight;
            } else {
                doc.text(cell, xPos, yPos);
            }
            xPos += headerWidths[i]; // Increment x-position by the width of the corresponding header
        });
    });

    // Finalize the PDF
    doc.end();

    await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', (err) => {
            fs.unlinkSync(filePath);
            reject(err);
        });
    });
};

const generateCSV = async (transactions, balance, filePath) => {
    const csvWriter = createObjectCsvWriter({
        path: filePath,
        header: [
            { id: 'created_at', title: 'Date' },
            { id: 'narration', title: 'Narration' },
            { id: 'credit', title: 'Credit' },
            { id: 'debit', title: 'Debit' },
            { id: 'amount', title: 'Amount' },
            { id: 'balance', title: 'Balance' }, // Add balance to the header
        ],
    });

    // Add balance to each transaction
    const records = transactions.map(transaction => ({
        created_at: transaction.created_at.toISOString(),
        narration: transaction.narration,
        credit: transaction.credit.toFixed(2),
        debit: transaction.debit.toFixed(2),
        amount: transaction.amount.toFixed(2),
        balance: balance.toFixed(2),
    }));

    await csvWriter.writeRecords(records);
};

router.get('/export-transactions', async (req, res) => {
    try {

        if (
            !req.headers.authorization ||
            !req.headers.authorization.startsWith("Bearer ") ||
            !req.headers.authorization.split(" ")[1]
        ) {
            return res.status(422).json({ message: "Please Provide Token!" });
        }

        const { startDate, endDate, email, format } = req.query;

        if (!startDate || !endDate || !email || !format) {
            return res.status(400).json({ message: 'Please provide startDate, endDate, email, and format (pdf or xls)' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        const transactions = await Trans.find({
            email: email,
            created_at: { $gte: start, $lte: end },
        });

        if (transactions.length === 0) {
            return res.status(404).json({ message: 'No transactions found' });
        }

        const balance = await fetchUserBalance(email);

        const fileName = `transactions.${format}`;
        const filePath = path.join(__dirname, `../temp/${fileName}`);

        if (format === 'pdf') {
            await generatePDF(transactions, balance, filePath);
        } else if (format === 'xls') {
            await generateCSV(transactions, balance, filePath);
        } else {
            return res.status(400).json({ message: "Invalid format. Use 'pdf' or 'xls'" });
        }

        // Upload file to Cloudinary
        cloudinary.uploader.upload(filePath, { folder: 'transactions', resource_type: 'raw' }, (error, result) => {
            fs.unlinkSync(filePath); // Delete local file after upload

            if (error) {
                return res.status(500).json({ message: error.message });
            }

            res.send({
                error: false,
                message: 'Transactions exported successfully',
                fileUrl: result.secure_url,
            });
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
