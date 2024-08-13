const mongoose = require('mongoose');

const userPayoutSchema = new mongoose.Schema({
    currency: { type: String, required: true },
    account_number: { type: String, default: null },
    routing_number: { type: String, default: null },
    swift_code: { type: String, default: null },
    bank_name: { type: String, default: null },
    beneficiary_name: { type: String, default: null },
    beneficiary_address: { type: String, default: null },
    beneficiary_country: { type: String, default: null },
    postal_code: { type: String, default: null },
    street_number: { type: String, default: null },
    street_name: { type: String, default: null },
    city: { type: String, default: null },
    account_bank: { type: String, default: null },
    email: { type: String, default: null },
    destination_branch_code: { type: String, default: null },
    debit_currency: { type: String, default: null },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserPayout', userPayoutSchema);
