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

    // Extract names from the response
    const artistNames = response.data.artists.items.map(item => ({
      name: item.name,
      id: item.id, // Include ID for future reference if needed
    }));

    res.status(200).send(artistNames);
  } catch (error) {
    console.error('Error fetching Spotify data:', error.message);
    res.status(500).send({ message: 'Internal server error' });
  }
});

module.exports = router;
