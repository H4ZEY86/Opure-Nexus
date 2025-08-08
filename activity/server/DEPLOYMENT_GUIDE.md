# Opure Discord Activity API - Cloud Deployment Guide

## 🚀 Quick Fix for Vercel Serverless Environment

Your API was crashing because it tried to access local SQLite databases from a serverless environment. This has been completely fixed with a cloud-compatible solution.

## ✅ What's Fixed

1. **Database**: Migrated from local SQLite to Supabase PostgreSQL (free tier)
2. **Services**: Created serverless-compatible service bridges
3. **Error Handling**: Added comprehensive fallbacks
4. **Performance**: Implemented intelligent caching and connection pooling

## 🔧 Setup Instructions

### 1. Create Supabase Database (Free)

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose region closest to your users)
3. In the SQL Editor, run this script: `/mnt/d/Opure.exe/activity/server/database/schema.sql`
4. Go to Settings > API to get your keys

### 2. Configure Vercel Environment Variables

Add these environment variables in your Vercel dashboard:

```env
# Discord Configuration
DISCORD_CLIENT_ID=1388207626944249856
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://api.opure.uk/api/auth/callback

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Deploy to Vercel

```bash
# From your server directory
vercel deploy --prod
```

## 🎯 Key Features

### Cloud Database Benefits
- **Scalable**: Auto-scales with usage
- **Reliable**: 99.9% uptime guarantee
- **Free Tier**: 500MB storage, 2GB bandwidth
- **Real-time**: Live data synchronization
- **Secure**: Row-level security enabled

### Performance Optimizations
- **Connection Pooling**: Efficient database connections
- **Intelligent Caching**: 15-minute cache with smart invalidation
- **Batch Operations**: Optimized for multiple users
- **Fallback Mode**: Works even if database is temporarily unavailable

### Discord-Specific Features
- **User Management**: Complete Discord user data sync
- **Achievement System**: 10 built-in achievements with rewards
- **Music Integration**: Playlist management and playback tracking
- **Real-time Sync**: Live session management
- **Command Logging**: Track all bot interactions

## 📊 Monitoring

### Health Check Endpoint
```
GET https://api.opure.uk/health
```

Returns:
- Database connection status
- Active user sessions
- Memory usage
- Cache efficiency

### Database Statistics
```sql
-- Monitor table sizes (important for free tier)
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🔒 Security Features

- **Row Level Security (RLS)**: Users can only access their own data
- **Service Role Protection**: API access properly secured
- **CORS Configuration**: Restricted to Discord domains
- **Input Validation**: All user inputs validated
- **Rate Limiting**: Built-in protection against abuse

## 🎮 API Endpoints

### Core Endpoints
- `GET /health` - Health check with detailed status
- `POST /api/auth/activity-sync` - Discord Activity authentication
- `GET /api/bot/sync/:userId` - Real-time user data sync
- `POST /api/bot/execute` - Execute bot commands
- `GET /api/music/playlists/:userId` - Get user playlists

### New Cloud Features
- Automatic user creation on first visit
- Real-time achievement tracking
- Session-based caching
- Intelligent fallback responses

## 📈 Scaling Strategy

### Free Tier Limits (Supabase)
- **Storage**: 500MB (efficient schema design keeps this low)
- **Bandwidth**: 2GB/month (cached responses reduce usage)
- **API Requests**: 50,000/month (optimized queries)

### When to Upgrade
- Monitor table sizes regularly
- Watch bandwidth usage in Supabase dashboard
- Upgrade if consistently hitting limits

### Performance Tips
1. Use cached endpoints when possible
2. Batch operations for multiple users
3. Clean up old session data periodically
4. Monitor slow queries and add indexes

## 🛠️ Troubleshooting

### Common Issues

**"Database connection failed"**
- Check Supabase service status
- Verify environment variables are set correctly
- API will use fallback mode automatically

**"User data not found"**
- New users are created automatically
- Check if Discord user ID is valid
- Verify database schema is deployed

**"Slow responses"**
- Enable Supabase connection pooling
- Check for missing database indexes
- Monitor cache hit rates

### Debug Mode
Add `DEBUG=true` to environment variables for detailed logging.

## 🔄 Migration from Local Database

If you have existing local SQLite data:

1. Export data from SQLite:
```sql
-- Export users
.headers on
.mode csv
.output users.csv
SELECT * FROM users;
```

2. Import to Supabase using their CSV import tool or:
```sql
COPY users FROM '/path/to/users.csv' DELIMITER ',' CSV HEADER;
```

## 📞 Support

Your Discord Activity API is now fully cloud-compatible and should work perfectly on Vercel!

- Health Check: https://api.opure.uk/health
- Test Sync: https://api.opure.uk/api/bot/sync/123456789
- Command Test: https://api.opure.uk/api/bot/commands