// This is a serverless function to handle the token exchange
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send({ error: 'Method not allowed' });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).send({ error: 'Code is required' });
  }

  try {
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.VITE_DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET, // This MUST be a server-side environment variable
        grant_type: 'authorization_code',
        code,
      }),
    });

    const data = await tokenResponse.json();
    res.status(200).send(data);

  } catch (error) {
    console.error('Error exchanging token:', error);
    res.status(500).send({ error: 'Internal server error' });
  }
}
