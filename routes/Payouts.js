require('dotenv').config()
const router = require("express").Router();
const fetch = require("node-fetch");
const User = require("../models/User");
const Trans = require("../models/Transactions");

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

module.exports = router;
