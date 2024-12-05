import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();  // Initialize the express app
const port = 3000;

// Enable CORS for your Chrome extension
app.use(cors({
  origin: 'chrome-extension://ldmpjmpicigfhojakldmfnlmdolcepeh',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));

// Body parser middleware to parse JSON bodies
app.use(bodyParser.json());

// Proxy endpoint to exchange code for tokens
app.post('/proxy/token', async (req, res) => {
  const { code, client_id, client_secret, redirect_uri } = req.body;

  try {
    const tokenUrl = 'https://app.sigparser.com/api/Ipaas/token';

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: client_id,
        client_secret: client_secret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri,
      }),
    });

    const responseText = await tokenResponse.text();
    console.log('Response Text:', responseText);

    if (!tokenResponse.ok) {
      console.error('Error Response:', responseText);
      throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
    }

    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
    } catch (e) {
      console.error('Error parsing response as JSON:', e);
      throw new Error(`Failed to parse token response: ${responseText}`);
    }

    res.json(tokenData);
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});




