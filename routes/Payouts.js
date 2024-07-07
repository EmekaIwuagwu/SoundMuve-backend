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
            amount,
        });

        await transactions.save();
        console.log("Transaction saved");

        return res.json({ error: false, data: json, message: "OK" });
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
        } else {
            res.status(400).json({ message: "Invalid currency" });
        }
    } catch (err) {
        next(err);
    }
});

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
            });

            await transactions.save();
            console.log("Transaction saved");

            return res.json({ error: false, data: json, message: "OK" });
        }
    } catch (err) {
        next(err);
    }
};

module.exports = router;
