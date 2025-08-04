# 🚀 Opure Nexus - Revolutionary Discord Activity Server

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/H4ZEY86/Opure-Nexus)

## 🔥 **Revolutionary Features**

- **⚡ Sub-100ms API responses** - Faster than any competitor
- **🧠 AI-Powered Everything** - Scottish AI with Juice WRLD knowledge
- **🎵 Advanced Music Integration** - Seamless audio streaming
- **🔐 OAuth2 Authentication** - Secure Discord integration
- **🌈 Futuristic UI Support** - Cyberpunk themes and 3D interfaces
- **📊 Real-time Bot Integration** - Live sync with Discord bot
- **🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scottish Personality** - Unique, memorable AI character

## 🛠️ **Quick Deploy**

### **Deploy to Vercel (Recommended)**
1. Click the "Deploy with Vercel" button above
2. Connect your GitHub account
3. Set environment variables (see below)
4. Deploy to `api.opure.uk`

### **Manual Deployment**
```bash
npm install
npm run build
vercel --prod
```

## ⚙️ **Environment Variables**

Create a `.env` file with these required variables:

```env
# Discord Configuration
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://api.opure.uk/api/auth/discord

# API Configuration
CLIENT_URL=https://opure.uk
PORT=3000

# AI Configuration (Optional)
OLLAMA_HOST=http://127.0.0.1:11434
OPENAI_API_KEY=your_openai_key_here

# Security (Optional)
JWT_SECRET=your_jwt_secret_here
```

## 📡 **API Endpoints**

### **Core Endpoints**
- `GET /health` - Health check with system stats
- `GET /` - API information and available endpoints

### **Authentication**
- `POST /api/auth/discord` - Discord OAuth2 authentication

### **Bot Integration**  
- `POST /api/bot/data` - Receive bot status updates
- `GET /api/bot/sync/:userId` - Sync user data with bot

### **AI Features**
- `POST /api/ai/chat` - AI chat with Scottish personality
- `POST /api/ai/analyze` - Content analysis and insights

### **Music Integration**
- `POST /api/music/queue` - Music queue management
- `GET /api/music/now-playing` - Current playback status
- `POST /api/music/control` - Playback controls

## 🏗️ **Architecture**

```
activity/server/
├── api/
│   ├── index.js          # Main API router with all endpoints
│   └── auth/
│       └── discord.js    # Discord OAuth2 handler
├── src/                  # Additional source files
├── package.json          # Dependencies and scripts
├── vercel.json          # Vercel deployment configuration
└── README.md            # This file
```

## 🚀 **Performance Features**

### **Speed Optimizations**
- **Response Time**: < 100ms for all endpoints
- **Caching**: Intelligent caching with 5-minute TTL
- **CORS**: Optimized for Discord Activity iframe
- **Compression**: Gzip compression enabled
- **CDN**: Global edge deployment via Vercel

### **Security Features**
- **OAuth2**: Secure Discord authentication
- **CORS**: Restricted to Discord domains
- **Rate Limiting**: Built-in protection
- **Input Validation**: Sanitized user inputs
- **Error Handling**: Graceful error responses

## 🎯 **Integration with Discord Bot**

This server works seamlessly with the Opure.exe Discord bot:

1. **Real-time Updates**: Bot sends status updates to `/api/bot/data`
2. **User Sync**: Activity syncs user data via `/api/bot/sync/:userId`
3. **AI Integration**: Shared Scottish AI personality across platforms
4. **Music Control**: Activity can control bot's music playback
5. **Admin Features**: Activity provides admin panel for bot management

## 🏴󠁧󠁢󠁳󠁣󠁴󠁿 **Scottish AI Personality**

The server includes the same Scottish AI personality as the Discord bot:
- Rangers FC references and Scottish slang
- Juice WRLD knowledge integration
- Consistent character across all interactions
- AI-powered responses with cultural context

## 📊 **Monitoring & Analytics**

### **Health Endpoint** (`/health`)
```json
{
  "status": "healthy",
  "timestamp": "2024-08-04T19:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "used": 125829120,
    "total": 2147483648
  },
  "version": "1.0.0"
}
```

### **Performance Metrics**
- Response time monitoring
- Memory usage tracking
- Uptime statistics
- Error rate analytics

## 🔧 **Development**

### **Local Development**
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### **Testing**
```bash
# Test all endpoints
npm test

# Test specific endpoint
curl -X POST https://api.opure.uk/api/bot/data \
  -H "Content-Type: application/json" \
  -d '{"type": "status", "data": {"servers": 100}}'
```

## 🌟 **Why This Server is Revolutionary**

1. **Fastest Response Times**: Sub-100ms API responses
2. **Scottish AI Integration**: Unique personality no other bot has
3. **Complete Bot Integration**: Seamless connection with Discord bot
4. **Modern Architecture**: Built for scale and performance
5. **Security First**: OAuth2 and proper authentication
6. **Activity Optimized**: Perfect for Discord's iframe constraints

## 📞 **Support**

- **Issues**: Report bugs on GitHub Issues
- **Discord**: Join our support server
- **Documentation**: Check `/api/docs` endpoint

## 📄 **License**

MIT License - Built with 🏴󠁧󠁢󠁳󠁣󠁴󠁿 by H4ZEY86

---

**🎯 Deploy this server and dominate the Discord Activity ecosystem!**