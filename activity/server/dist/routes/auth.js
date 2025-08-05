"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const axios_1 = __importDefault(require("axios"));
const zod_1 = require("zod");
const logger_1 = require("../utils/logger");
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
exports.authRouter = router;
const discordAuthSchema = zod_1.z.object({
    code: zod_1.z.string().min(1, 'Authorization code is required'),
});
const DISCORD_API_BASE = 'https://discord.com/api/v10';
router.post('/discord', (0, validation_1.validateRequest)(discordAuthSchema), async (req, res) => {
    try {
        const { code } = req.body;
        const tokenResponse = await axios_1.default.post(`${DISCORD_API_BASE}/oauth2/token`, new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri: process.env.DISCORD_REDIRECT_URI,
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 10000,
        });
        const { access_token, refresh_token, expires_in } = tokenResponse.data;
        const userResponse = await axios_1.default.get(`${DISCORD_API_BASE}/users/@me`, {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
            timeout: 10000,
        });
        const user = userResponse.data;
        const jwtToken = jsonwebtoken_1.default.sign({
            userId: user.id,
            username: user.username,
            discriminator: user.discriminator,
            avatar: user.avatar,
            globalName: user.global_name,
        }, process.env.JWT_SECRET, {
            expiresIn: '7d',
            issuer: 'opure-activity',
            audience: 'opure-users',
        });
        logger_1.logger.info(`User authenticated: ${user.username}#${user.discriminator} (${user.id})`);
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                discriminator: user.discriminator,
                avatar: user.avatar,
                globalName: user.global_name,
            },
            token: jwtToken,
            expiresIn: expires_in,
        });
    }
    catch (error) {
        logger_1.logger.error('Discord authentication failed:', error);
        if (axios_1.default.isAxiosError(error)) {
            if (error.response?.status === 400) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid authorization code',
                    message: 'The provided authorization code is invalid or expired',
                });
                return;
            }
            if (error.response?.status === 429) {
                res.status(429).json({
                    success: false,
                    error: 'Rate limited',
                    message: 'Too many authentication requests. Please try again later.',
                });
                return;
            }
        }
        res.status(500).json({
            success: false,
            error: 'Authentication failed',
            message: 'Failed to authenticate with Discord. Please try again.',
        });
    }
});
router.post('/refresh', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'No token provided',
            });
            return;
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, {
            ignoreExpiration: true,
        });
        const newToken = jsonwebtoken_1.default.sign({
            userId: decoded.userId,
            username: decoded.username,
            discriminator: decoded.discriminator,
            avatar: decoded.avatar,
            globalName: decoded.globalName,
        }, process.env.JWT_SECRET, {
            expiresIn: '7d',
            issuer: 'opure-activity',
            audience: 'opure-users',
        });
        res.json({
            success: true,
            token: newToken,
        });
    }
    catch (error) {
        logger_1.logger.error('Token refresh failed:', error);
        res.status(401).json({
            success: false,
            error: 'Invalid token',
        });
    }
});
router.get('/verify', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'No token provided',
            });
            return;
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        res.json({
            success: true,
            user: {
                id: decoded.userId,
                username: decoded.username,
                discriminator: decoded.discriminator,
                avatar: decoded.avatar,
                globalName: decoded.globalName,
            },
        });
    }
    catch (error) {
        res.status(401).json({
            success: false,
            error: 'Invalid token',
        });
    }
});
router.get('/profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'No token provided',
            });
            return;
        }
        const token = authHeader.substring(7);
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userData = {
            discord: {
                id: decoded.userId,
                username: decoded.username,
                discriminator: decoded.discriminator,
                avatar: decoded.avatar,
                globalName: decoded.globalName,
                roles: ['member'],
                permissions: ['use_commands', 'play_music'],
            },
            economy: {
                balance: 1000,
                bank: 5000,
                level: 15,
                experience: 2400,
                daily_streak: 7,
                last_daily: new Date().toISOString(),
            },
            playlists: [
                {
                    id: 'playlist_1',
                    name: 'My Favorites',
                    tracks: [
                        { title: 'Song 1', artist: 'Artist 1', duration: 240 },
                        { title: 'Song 2', artist: 'Artist 2', duration: 180 },
                    ],
                    created_at: new Date('2024-01-01').toISOString(),
                }
            ],
            profile: {
                bio: 'Rangers fan and music lover! 🎵⚽',
                favorite_artists: ['Juice WRLD', 'Post Malone'],
                total_plays: 342,
                joined_at: new Date('2024-01-01').toISOString(),
            },
            friends: [
                {
                    id: '123456789',
                    username: 'friend1',
                    avatar: 'avatar_hash',
                    status: 'online',
                }
            ],
            achievements: [
                {
                    id: 'first_song',
                    name: 'First Song',
                    description: 'Played your first song',
                    unlocked_at: new Date('2024-01-01').toISOString(),
                }
            ],
            stats: {
                total_commands: 156,
                songs_played: 342,
                voice_time: 12450,
                last_active: new Date().toISOString(),
            }
        };
        res.json({
            success: true,
            user: userData,
        });
    }
    catch (error) {
        logger_1.logger.error('Profile fetch failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user profile',
        });
    }
});
//# sourceMappingURL=auth.js.map