// File: /api/auth/discord.js

export default async function handler(req, res) {
  // Get the authorization 'code' from the URL query parameters
  // sent by Discord after the user approves.
  const { code } = req.query;

  // If a code is present, the first step is successful.
  if (code) {
    try {
      // TODO:
      // The next critical step is to exchange this 'code' for an
      // access token by making a POST request to Discord's API.
      // This part requires using your Client ID and Client Secret.

      console.log(`Received authorization code: ${code}`);

      // For now, we'll just send a success message.
      // In a real app, you would redirect the user back to your
      // frontend after setting a session cookie.
      res.status(200).send('Success! The authorization code was received.');

    } catch (error) {
      console.error('Error processing Discord auth callback:', error);
      res.status(500).send('Internal Server Error');
    }
  } else {
    // If no code is found, send an error.
    res.status(400).send('Error: Authorization code not provided.');
  }
}