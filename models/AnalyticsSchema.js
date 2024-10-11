const mongoose = require('mongoose');

// Schema for Albums Analytics
const albumAnalyticsSchema = new mongoose.Schema({
    email: { type: String, required: true },
    album_name: { type: String, required: true },
    song_title: { type: String, required: true },
    album_id: { type: String, required: true },
    album_sold: { type: Number, required: true },
    stream: {
        apple: { type: Number, required: true },
        spotify: { type: Number, required: true }
    },
    revenue: {
        apple: { type: Number, required: true },
        spotify: { type: Number, required: true }
    },
    streamTime: {
        apple: { type: Number, required: true },  // Total stream time in seconds for Apple
        spotify: { type: Number, required: true } // Total stream time in seconds for Spotify
    },
    created_at: { type: Date, default: Date.now }
});

const AlbumAnalytics = mongoose.model('AlbumAnalytics', albumAnalyticsSchema);

// Schema for Single Analytics
const singleAnalyticsSchema = new mongoose.Schema({
    email: { type: String, required: true },
    single_name: { type: String, required: true },
    song_title: { type: String, required: true },
    singles_id: { type: String, required: true },
    single_sold: { type: Number, required: true },
    stream: {
        apple: { type: Number, required: true },
        spotify: { type: Number, required: true }
    },
    revenue: {
        apple: { type: Number, required: true },
        spotify: { type: Number, required: true }
    },
    streamTime: {
        apple: { type: Number, required: true },  // Total stream time in seconds for Apple
        spotify: { type: Number, required: true } // Total stream time in seconds for Spotify
    },
    created_at: { type: Date, default: Date.now }
});

const SingleAnalytics = mongoose.model('SingleAnalytics', singleAnalyticsSchema);

// Schema for Store Analytics
const storeSchema = new mongoose.Schema({
    store_name: { type: String, required: true },
    song_title: { type: String, required: true },
    album_title: { type: String, required: true },
    album_sold: { type: Number, required: true },
    song_sold: { type: Number, required: true },
    streams: { type: Number, required: true },
    total: { type: Number, required: true },
    created_at: { type: Date, default: Date.now }
});

const Store = mongoose.model('Store', storeSchema);

// Schema for Location Analytics
const locationSchema = new mongoose.Schema({
    email: { type: String, required: true },
    location: { type: String, required: true },
    song_title: { type: String, required: true },
    album_title: { type: String, required: true },
    album_sold: { type: String, required: true },
    single_sold: { type: Number, required: true },
    streams: { type: Number, required: true },
    total: { type: Number, required: true },
    created_at: { type: Date, default: Date.now }
});

const Location = mongoose.model('Location', locationSchema);

module.exports = {
    AlbumAnalytics,
    SingleAnalytics,
    Store,
    Location
};
