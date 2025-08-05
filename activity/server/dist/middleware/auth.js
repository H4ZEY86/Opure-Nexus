import jwt from 'jsonwebtoken';
import axios from 'axios';
export function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    const token = authHeader.substring(7);
    try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET not configured');
            return res.status(500).json({ error: 'Server configuration error' });
        }
        const decoded = jwt.verify(token, jwtSecret);
        req.user = decoded.user;
        req.discordContext = decoded.discordContext;
        next();
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ error: 'Token expired' });
        }
        else if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        else {
            console.error('JWT verification error:', error);
            return res.status(500).json({ error: 'Token verification failed' });
        }
    }
}
export async function verifyDiscordToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing Discord access token' });
    }
    const discordToken = authHeader.substring(7);
    try {
        const response = await axios.get('https://discord.com/api/v10/users/@me', {
            headers: {
                'Authorization': `Bearer ${discordToken}`,
                'User-Agent': 'Opure.exe Discord Activity'
            },
            timeout: 5000
        });
        req.user = response.data;
        next();
    }
    catch (error) {
        if (error.response?.status === 401) {
            return res.status(401).json({ error: 'Invalid Discord token' });
        }
        else if (error.code === 'ECONNABORTED') {
            return res.status(408).json({ error: 'Discord API timeout' });
        }
        else {
            console.error('Discord token verification error:', error.message);
            return res.status(500).json({ error: 'Token verification failed' });
        }
    }
}
export function requireUserOwnership(req, res, next) {
    const requestedUserId = req.params.userId || req.validatedData?.userId;
    const authenticatedUserId = req.user?.id || req.discordContext?.userId;
    if (!authenticatedUserId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }
    if (!requestedUserId) {
        return res.status(400).json({ error: 'User ID required' });
    }
    if (requestedUserId !== authenticatedUserId) {
        return res.status(403).json({ error: 'Access denied: can only access your own data' });
    }
    next();
}
export function requireAdmin(req, res, next) {
    const userId = req.user?.id || req.discordContext?.userId;
    const adminUsers = (process.env.ADMIN_USER_IDS || '').split(',').map(id => id.trim());
    if (!userId || !adminUsers.includes(userId)) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
}
export function requireGuildMembership(req, res, next) {
    const requiredGuildId = process.env.GUILD_ID;
    const userGuildId = req.discordContext?.guildId;
    if (!requiredGuildId) {
        return next();
    }
    if (!userGuildId || userGuildId !== requiredGuildId) {
        return res.status(403).json({ error: 'Guild membership required' });
    }
    next();
}
export function generateJWT(user, discordContext) {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
    }
    const payload = {
        user: {
            id: user.id,
            username: user.username,
            discriminator: user.discriminator,
            avatar: user.avatar
        },
        discordContext,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
    };
    return jwt.sign(payload, jwtSecret, { algorithm: 'HS256' });
}
export function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return next();
    }
    verifyJWT(req, res, (err) => {
        if (err) {
            req.user = undefined;
            req.discordContext = undefined;
        }
        next();
    });
}
