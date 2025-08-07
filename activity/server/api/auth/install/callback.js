// Discord Bot Installation Callback Handler
// This handles the OAuth2 redirect after bot installation

export default async function handler(req, res) {
  console.log(`🤖 Bot Installation Callback: ${req.method} ${req.url}`)
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { code, guild_id, error, error_description, permissions, scope } = req.query
    
    console.log('🔍 Bot installation callback params:', {
      hasCode: !!code,
      guildId: guild_id,
      error: error,
      permissions: permissions,
      scope: scope
    })
    
    // Handle OAuth2 error
    if (error) {
      console.error('❌ Bot installation error:', error, error_description)
      
      // Create error response page
      const errorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bot Installation Failed</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f0f0; }
            .error { background: #ffebee; border: 1px solid #f44336; padding: 20px; border-radius: 8px; display: inline-block; }
            .error h1 { color: #d32f2f; margin: 0 0 10px 0; }
            .error p { color: #666; margin: 5px 0; }
            .button { background: #5865f2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>❌ Bot Installation Failed</h1>
            <p><strong>Error:</strong> ${error}</p>
            ${error_description ? `<p><strong>Details:</strong> ${error_description}</p>` : ''}
            <p>The bot was not installed. You can try again or contact support.</p>
            <a href="https://www.opure.uk" class="button">Return to Opure</a>
          </div>
        </body>
        </html>
      `
      
      return res.status(400).send(errorHtml)
    }
    
    // Success case - bot was installed
    if (code && guild_id) {
      console.log('✅ Bot successfully installed to guild:', guild_id)
      console.log('🔍 Installation details:', {
        code: code.substring(0, 10) + '...',
        guild_id,
        permissions,
        scope
      })
      
      // Create success response page
      const successHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bot Installed Successfully</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f0f0; }
            .success { background: #e8f5e8; border: 1px solid #4caf50; padding: 20px; border-radius: 8px; display: inline-block; }
            .success h1 { color: #388e3c; margin: 0 0 10px 0; }
            .success p { color: #666; margin: 5px 0; }
            .button { background: #5865f2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
            .guild-info { background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="success">
            <h1>✅ Opure Bot Installed Successfully!</h1>
            <p>The Opure Discord bot has been installed to your server.</p>
            <div class="guild-info">
              <strong>Server ID:</strong> ${guild_id}<br>
              <strong>Permissions:</strong> ${permissions || 'Default'}<br>
              <strong>Scopes:</strong> ${scope || 'bot, applications.commands'}
            </div>
            <p>You can now use bot commands and launch Discord Activities!</p>
            <a href="https://discord.com/channels/${guild_id}" class="button">Go to Your Server</a>
            <a href="https://www.opure.uk" class="button">Visit Opure</a>
          </div>
          <script>
            // Auto-close if opened in popup
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'bot_installation_success', 
                guild_id: '${guild_id}',
                permissions: '${permissions}' 
              }, '*');
              setTimeout(() => window.close(), 3000);
            }
          </script>
        </body>
        </html>
      `
      
      return res.status(200).send(successHtml)
    }
    
    // No code or guild_id - something went wrong
    console.error('❌ Bot installation callback missing required parameters')
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bot Installation Incomplete</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f0f0; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 8px; display: inline-block; }
          .warning h1 { color: #856404; margin: 0 0 10px 0; }
          .warning p { color: #666; margin: 5px 0; }
          .button { background: #5865f2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="warning">
          <h1>⚠️ Bot Installation Incomplete</h1>
          <p>The bot installation process was not completed properly.</p>
          <p>Please try the installation process again.</p>
          <a href="https://api.opure.uk/api/auth/install" class="button">Try Again</a>
          <a href="https://www.opure.uk" class="button">Return to Opure</a>
        </div>
      </body>
      </html>
    `
    
    return res.status(400).send(errorHtml)
    
  } catch (error) {
    console.error('💥 Bot installation callback error:', error)
    
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bot Installation Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f0f0f0; }
          .error { background: #ffebee; border: 1px solid #f44336; padding: 20px; border-radius: 8px; display: inline-block; }
          .error h1 { color: #d32f2f; margin: 0 0 10px 0; }
          .error p { color: #666; margin: 5px 0; }
          .button { background: #5865f2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>❌ Bot Installation Error</h1>
          <p>An unexpected error occurred during bot installation.</p>
          <p><strong>Error:</strong> ${error.message}</p>
          <a href="https://api.opure.uk/api/auth/install" class="button">Try Again</a>
          <a href="https://www.opure.uk" class="button">Return to Opure</a>
        </div>
      </body>
      </html>
    `
    
    return res.status(500).send(errorHtml)
  }
}