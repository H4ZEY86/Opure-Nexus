import axios from 'axios';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
export class SimpleOAuth2Handler {
    constructor(db) {
        this.db = db;
        this.clientId = process.env.DISCORD_CLIENT_ID;
        this.clientSecret = process.env.DISCORD_CLIENT_SECRET;
        this.redirectUri = process.env.DISCORD_REDIRECT_URI;
        this.jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
    }
    generateAuthUrl(state) {
        const scopes = ['identify', 'guilds', 'email'].join(' ');
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            response_type: 'code',
            scope: scopes,
            ...(state && { state })
        });
        return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
    }
    async exchangeCode(code) {
        try {
            const response = await axios.post('https://discord.com/api/oauth2/token', {
                client_id: this.clientId,
                client_secret: this.clientSecret,
                grant_type: 'authorization_code',
                code,
                redirect_uri: this.redirectUri,
            }, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            });
            return response.data;
        }
        catch (error) {
            console.error('OAuth2 token exchange error:', error);
            throw new Error('Failed to exchange authorization code');
        }
    }
    async getDiscordUser(accessToken) {
        try {
            const response = await axios.get('https://discord.com/api/users/@me', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        }
        catch (error) {
            console.error('Discord user fetch error:', error);
            throw new Error('Failed to fetch Discord user');
        }
    }
    async getDiscordGuilds(accessToken) {
        try {
            const response = await axios.get('https://discord.com/api/users/@me/guilds', {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            return response.data;
        }
        catch (error) {
            console.error('Discord guilds fetch error:', error);
            throw new Error('Failed to fetch Discord guilds');
        }
    }
    createJWT(payload, expiresIn = '24h') {
        return jwt.sign(payload, this.jwtSecret, { expiresIn: expiresIn });
    }
    verifyJWT(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        }
        catch (error) {
            console.error('JWT verification error:', error);
            throw new Error('Invalid token');
        }
    }
    requireAuth() {
        return (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                if (!authHeader) {
                    return res.status(401).json({ error: 'No authorization header' });
                }
                const token = authHeader.replace('Bearer ', '');
                const decoded = this.verifyJWT(token);
                req.user = decoded;
                next();
            }
            catch (error) {
                res.status(401).json({ error: 'Invalid token' });
            }
        };
    }
    async storeUserSession(session) {
        const sessions = this.db.data?.user_sessions || [];
        const existingIndex = sessions.findIndex((s) => s.userId === session.userId && s.guildId === session.guildId);
        if (existingIndex >= 0) {
            sessions[existingIndex] = session;
        }
        else {
            sessions.push(session);
        }
        if (!this.db.data?.user_sessions) {
            this.db.data = { ...this.db.data, user_sessions: sessions };
        }
        else {
            this.db.data.user_sessions = sessions;
        }
        await this.db.write();
    }
    async getUserSession(userId, guildId) {
        const sessions = this.db.data?.user_sessions || [];
        return sessions.find((s) => s.userId === userId && s.guildId === guildId) || null;
    }
}
