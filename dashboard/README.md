# 🎮 Opure.exe 3D Dashboard System

A comprehensive, real-time 3D web dashboard for monitoring and controlling the Opure.exe Discord bot. Built with cutting-edge web technologies and optimized for RTX 5070 Ti graphics performance.

## 🏴󠁧󠁢󠁳󠁣󠁴󠁿 Made in Scotland • Rangers FC 🔵

This project proudly represents Scottish tech innovation with Rangers FC themed elements throughout the interface.

---

## ✨ Features

### 🌐 3D Command Center
- **Real-time 3D visualizations** using Three.js and React Three Fiber
- **Interactive system monitoring** with floating data cubes and rotating status wheels
- **Neural network visualization** for AI system status
- **RTX 5070 Ti optimized rendering** with post-processing effects

### 📊 System Monitoring
- **RTX 5070 Ti GPU monitoring** with detailed performance metrics
- **CPU, RAM, and storage** real-time usage tracking
- **Network activity** monitoring and analysis
- **Temperature and power consumption** tracking

### 💬 Discord Integration
- **Live Discord Activities** status from opure.uk
- **Context menu usage analytics** with right-click command tracking
- **Real-time user interaction** streams and statistics
- **Server and guild** monitoring dashboard

### 🧠 AI Analytics Hub
- **gpt-oss:20b model** performance metrics and status
- **ChromaDB vector database** monitoring and statistics
- **Personality mode** usage tracking and analysis
- **Response time** and quality metrics visualization

### 🎮 Gaming & Economy
- **3D game statistics** for Space Race, Ball Bouncer, Cube Dash, Color Matcher
- **Tournament leaderboards** and prize pool tracking
- **Fragment economy** visualization with transaction flows
- **Achievement system** progress and rare achievement tracking

### ⚡ Real-Time Data Streaming
- **WebSocket integration** for live data updates
- **Event stream monitoring** with real-time notifications
- **Performance history** tracking and analysis
- **Live command execution** monitoring

---

## 🚀 Technology Stack

### Frontend
- **Next.js 14** - React framework with server-side rendering
- **Three.js + React Three Fiber** - 3D graphics and animations
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling with custom cyberpunk theme
- **Framer Motion** - Smooth animations and transitions
- **Chart.js** - Data visualization and analytics charts
- **Socket.IO Client** - Real-time WebSocket communication

### Backend Integration
- **WebSocket Server** - Python-based real-time data server
- **SQLite Database** - Bot data storage and retrieval
- **Discord API** - Live bot status and guild information
- **System Monitoring** - psutil for hardware metrics

### 3D Graphics & Performance
- **RTX 5070 Ti Optimization** - Hardware-accelerated rendering
- **Post-processing Effects** - Bloom, chromatic aberration, and more
- **Performance Monitoring** - FPS tracking and GPU utilization
- **Responsive 3D** - Mobile and desktop optimized

---

## 🛠️ Installation & Setup

### Prerequisites
- **Node.js 18+** - JavaScript runtime
- **Python 3.8+** - Backend WebSocket server
- **RTX 5070 Ti** - Recommended for optimal 3D performance
- **Discord Bot** - Opure.exe bot running

### Quick Start
```bash
# Clone and navigate to dashboard
cd /mnt/d/Opure.exe/dashboard

# Install dependencies
npm install

# Start the complete system (WebSocket + Dashboard)
python ../start_dashboard_system.py

# Or start components separately:
# 1. Start WebSocket server
python ../websocket_server.py

# 2. Start dashboard (in another terminal)
npm run dev
```

### Manual Setup
```bash
# Install Python dependencies
pip install websockets psutil sqlite3 gputil

# Install Node.js dependencies
npm install

# Build for production
npm run build
npm start
```

---

## 🔧 Configuration

### WebSocket Configuration
The dashboard connects to the WebSocket server at `ws://localhost:8001` by default. This can be configured in:
- `src/hooks/useWebSocket.ts`
- `src/hooks/useBotData.ts`
- `src/hooks/useRealTimeData.ts`

### Theme Customization
Cyberpunk and Scottish elements can be customized in:
- `tailwind.config.js` - Color schemes and animations
- `src/app/globals.css` - Custom CSS classes and effects
- `src/components/` - Individual component styling

### 3D Scene Settings
Three.js scene configuration:
- `src/components/Dashboard3D.tsx` - Main 3D scene setup
- `src/components/SystemMonitor.tsx` - Hardware monitoring visuals
- Performance settings optimized for RTX 5070 Ti

---

## 📱 Usage

### Navigation
The dashboard features a tabbed interface with six main views:

1. **🎮 3D Command Center** - Interactive 3D visualizations
2. **🖥️ RTX 5070 Ti Monitor** - GPU and system performance
3. **💬 Discord Analytics** - Bot status and user activity
4. **🧠 AI Intelligence Hub** - AI model and ChromaDB metrics
5. **⚡ Live Data Stream** - Real-time event monitoring
6. **💰 Economy & Gaming** - Fragment economy and game statistics

### Real-Time Features
- **Live Updates** - Data refreshes every 2-5 seconds via WebSocket
- **Interactive Elements** - Click and hover for detailed information
- **Performance Monitoring** - RTX 5070 Ti stats in bottom-right
- **Connection Status** - WebSocket connection indicator top-left

### Scottish/Rangers Elements
- **Color Scheme** - Rangers blue (#0066cc) accents throughout
- **Typography** - Scottish flag emoji and Rangers FC branding
- **Cultural References** - "Made in Scotland" proudly displayed

---

## 🔌 WebSocket API

The dashboard communicates with the bot via WebSocket messages:

### Incoming Messages (from bot)
```javascript
// Bot status update
{
  "type": "bot_update",
  "data": {
    "status": "online",
    "guilds": 5,
    "users": 1250,
    "commands_executed": 15420,
    "latency": 45.0
  },
  "timestamp": 1640995200000
}

// Command execution event
{
  "type": "command_executed",
  "data": {
    "command": "ai",
    "user_id": "123456789",
    "guild_id": "987654321"
  },
  "timestamp": 1640995200000
}

// System performance update
{
  "type": "system_update",
  "data": {
    "cpu": 25.5,
    "memory": 45.2,
    "gpu": 15.8
  },
  "timestamp": 1640995200000
}
```

### Outgoing Messages (to bot)
```javascript
// Request specific data
{
  "type": "request_update",
  "data": {
    "update_type": "performance"
  }
}

// Ping for connection health
{
  "type": "ping",
  "timestamp": 1640995200000
}
```

---

## 🎨 Customization

### Adding New Visualizations
1. Create component in `src/components/`
2. Import in `src/app/page.tsx`
3. Add to navigation menu
4. Connect to WebSocket data in `useRealTimeData`

### Custom 3D Elements
```typescript
// Add to Dashboard3D.tsx
function CustomVisualization({ position, data }: any) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#00ffff" />
    </mesh>
  )
}
```

### Color Scheme Updates
```javascript
// In tailwind.config.js
colors: {
  'custom-primary': '#your-color',
  'custom-secondary': '#your-color'
}
```

---

## 🔍 Troubleshooting

### Common Issues

**Dashboard won't start:**
- Check Node.js version (18+ required)
- Verify dependencies: `npm install`
- Check port 3001 availability

**WebSocket connection failed:**
- Ensure WebSocket server is running on port 8001
- Check firewall settings
- Verify bot WebSocket integration

**3D graphics performance issues:**
- Update GPU drivers (RTX 5070 Ti)
- Reduce browser zoom level
- Close other GPU-intensive applications

**Missing data:**
- Verify bot database path in WebSocket server
- Check bot WebSocket integration
- Ensure Discord bot is running

### Performance Optimization

**For RTX 5070 Ti:**
```javascript
// In Dashboard3D.tsx
<Canvas
  gl={{ 
    powerPreference: "high-performance",
    antialias: true 
  }}
  dpr={Math.min(window.devicePixelRatio, 2)}
>
```

**Memory Management:**
- Dashboard automatically cleans up old data
- WebSocket messages are cached with TTL
- 3D objects are disposed when unmounted

---

## 🚀 Deployment

### Development
```bash
npm run dev  # Starts on localhost:3001
```

### Production
```bash
npm run build
npm start
```

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

---

## 🤝 Integration with Bot

The dashboard integrates with the main Opure.exe bot through:

1. **WebSocket Integration** - `core/websocket_integration.py`
2. **Database Queries** - Direct SQLite access for historical data
3. **Real-time Events** - Command execution, achievements, etc.

### Bot Setup
Ensure the bot includes WebSocket integration:
```python
# In bot.py
from core.websocket_integration import setup_websocket_integration

# After bot initialization
setup_websocket_integration(bot)
```

---

## 📊 Performance Metrics

### Optimized for RTX 5070 Ti
- **Target FPS:** 60 FPS constant
- **GPU Utilization:** 15-25% for dashboard
- **Memory Usage:** <2GB VRAM
- **CPU Usage:** <10% on modern processors

### Real-time Capabilities
- **WebSocket Latency:** <50ms
- **Update Frequency:** 2-5 second intervals
- **Data Processing:** Asynchronous with caching
- **3D Rendering:** Hardware-accelerated

---

## 🏆 Credits

**Developed by:** Opure.exe Team  
**Location:** Scotland 🏴󠁧󠁢󠁳󠁣󠁴󠁿  
**Team:** Rangers FC Supporters 🔵  
**Graphics:** RTX 5070 Ti Optimized  

### Technologies Used
- Next.js & React
- Three.js & React Three Fiber
- TypeScript & Tailwind CSS
- WebSocket & Socket.IO
- Python & SQLite
- Chart.js & Framer Motion

---

## 📄 License

This project is part of the Opure.exe Discord bot system. All rights reserved.

**Made with ❤️ in Scotland**  
**Rangers FC Forever 🔵⚪🔴**

---

*For support, issues, or contributions, please refer to the main Opure.exe project documentation.*