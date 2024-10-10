const express = require('express');
const axios = require('axios');
const qs = require('qs');

const router = express.Router();

const checkToken = (req, res, next) => {
    if (
        !req.headers.authorization ||
        !req.headers.authorization.startsWith("Bearer ") ||
        !req.headers.authorization.split(" ")[1]
    ) {
        return res.status(422).json({ message: "Please Provide Token!" });
    }
    next();
};

// Function to get Spotify access token
const getSpotifyAccessToken = async () => {
    const tokenUrl = 'https://accounts.spotify.com/api/token';
    const body = qs.stringify({
        grant_type: 'client_credentials',
    });

    const response = await axios.post(tokenUrl, body, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
        },
    });

    return response.data.access_token;
};

// Endpoint to search artist by name on Spotify
router.get('/search/spotify', checkToken, async (req, res) => {
    const { artist } = req.query;
    if (!artist) {
        return res.status(400).send({ message: 'Artist name is required' });
    }

    try {
        const accessToken = await getSpotifyAccessToken();
        const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(artist)}&type=artist`;

        const response = await axios.get(searchUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });

        // Extract artist data
        const artists = response.data.artists.items;

        // Create an array to hold artist details with the latest album and profile picture
        const artistDetails = await Promise.all(artists.map(async (item) => {
            const artistId = item.id;
            const profilePicture = item.images[0] ? item.images[0].url : null;

            // Fetch albums for the artist
            const albumsUrl = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album&limit=1&sort=release_date`;
            const albumsResponse = await axios.get(albumsUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            // Get the latest album
            const latestAlbum = albumsResponse.data.items.length > 0 ? albumsResponse.data.items[0] : null;

            return {
                name: item.name,
                id: artistId,
                profilePicture,
                latestAlbum: latestAlbum ? {
                    name: latestAlbum.name,
                    releaseDate: latestAlbum.release_date,
                    externalUrl: latestAlbum.external_urls.spotify,
                } : null,
            };
        }));

        res.status(200).send(artistDetails);
    } catch (error) {
        console.error('Error fetching Spotify data:', error.message);
        res.status(500).send({ message: 'Internal server error' });
    }
});

module.exports = router;
