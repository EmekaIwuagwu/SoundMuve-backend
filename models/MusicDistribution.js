const mongoose = require('mongoose');

const musicDistributionSchema = new mongoose.Schema({

    youtubeLink: {
        type: String,
        default:null,
        max: 255,
    },
    facebookInstaLink: {
        type: String,
        default:null,
        max: 255,
    },
    xLink: {
        type: String,
        default:null,
        max: 255,
    },

    email: {
        type: String,
        default:null,
        max: 255,
    },

});

module.exports = mongoose.model('MusicDistribution', musicDistributionSchema);