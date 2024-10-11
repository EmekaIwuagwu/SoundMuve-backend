const mongoose = require('mongoose');
const { AlbumAnalytics, SingleAnalytics, Store, Location } = require('./AnalyticsSchema');

// Sample AlbumAnalytics data
const sampleAlbumData = [
    {
        email: "latham01@yopmail.com",
        album_name: "My New Album",
        album_id: "66ab92da54d8070230d84933",
        album_sold: 150,
        stream: {
            apple: 1000,
            spotify: 2000
        },
        revenue: {
            apple: 1500,
            spotify: 2500
        },
        streamTime: {
            apple: 3000,
            spotify: 4000
        },
        created_at: "2024-10-11T00:00:00Z"
    },
    {
        email: "latham01@yopmail.com",
        album_name: "My New Album",
        album_id: "66ab92da54d8070230d84933",
        album_sold: 200,
        stream: {
            apple: 1500,
            spotify: 3000
        },
        revenue: {
            apple: 2500,
            spotify: 3500
        },
        streamTime: {
            apple: 3500,
            spotify: 4500
        },
        created_at: "2024-10-11T00:00:00Z"
    }
];

// Sample SingleAnalytics data
const sampleSingleData = [
    {
        email: "latham01@yopmail.com",
        single_name: "Monkey Doo",
        song_title: "Monkey Doo",
        singles_id: "66992a8b75bcb2e836a641cb",
        single_sold: 500,
        stream: {
            apple: 3000,
            spotify: 4000
        },
        revenue: {
            apple: 3500,
            spotify: 4500
        },
        streamTime: {
            apple: 2500,
            spotify: 3500
        },
        created_at: "2024-10-11T00:00:00Z"
    },
    {
        email: "latham01@yopmail.com",
        single_name: "Monkey Doo",
        song_title: "Another Hit",
        singles_id: "66992a8b75bcb2e836a641cb",
        single_sold: 600,
        stream: {
            apple: 3500,
            spotify: 5000
        },
        revenue: {
            apple: 4000,
            spotify: 6000
        },
        streamTime: {
            apple: 3000,
            spotify: 4500
        },
        created_at: "2024-10-11T00:00:00Z"
    }
];

// Sample Store data
const sampleStoreData = [
    {
        store_name: "iTunes",
        song_title: "Monkey Doo",
        album_title: "My New Album",
        album_sold: 100,
        song_sold: 200,
        streams: 5000,
        total: 7000,
        created_at: "2024-10-11T00:00:00Z"
    },
    {
        store_name: "Spotify",
        song_title: "Another Hit",
        album_title: "Another Album",
        album_sold: 150,
        song_sold: 250,
        streams: 6000,
        total: 8000,
        created_at: "2024-10-11T00:00:00Z"
    }
];

// Sample Location data
const sampleLocationData = [
    {
        email: "latham01@yopmail.com",
        location: "New York",
        song_title: "Monkey Doo",
        album_title: "My New Album",
        album_sold: 100,
        single_sold: 50,
        streams: 3000,
        total: 3500,
        created_at: "2024-10-11T00:00:00Z"
    },
    {
        email: "latham01@yopmail.com",
        location: "Los Angeles",
        song_title: "Another Hit",
        album_title: "Another Album",
        album_sold: 200,
        single_sold: 80,
        streams: 5000,
        total: 6000,
        created_at: "2024-10-11T00:00:00Z"
    }
];

mongoose.connect('mongodb+srv://migospay:5gi9mrI7ICAE40Jj@cluster0.rp3pump.mongodb.net/techguard', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(async () => {
        await AlbumAnalytics.insertMany(sampleAlbumData);
        await SingleAnalytics.insertMany(sampleSingleData);
        await Store.insertMany(sampleStoreData);
        await Location.insertMany(sampleLocationData);
        console.log('Sample data inserted successfully!');
        mongoose.connection.close();
    })
    .catch(err => console.error(err));
