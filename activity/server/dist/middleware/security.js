import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
export const securityConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: [
                "'self'",
                "https://discord.com",
                "https://*.discord.com",
                "https://*.discordapp.com"
            ],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                "https://discord.com",
                "https://*.discord.com",
                "https://*.discordapp.com"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://cdn.jsdelivr.net"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdn.jsdelivr.net"
            ],
            imgSrc: [
                "'self'",
                "data:",
                "https:",
                "https://cdn.discordapp.com",
                "https://media.discordapp.net"
            ],
            connectSrc: [
                "'self'",
                "wss:",
                "ws:",
                "https://discord.com",
                "https://*.discord.com",
                "https://*.discordapp.com",
                process.env.VITE_API_URL || "http://localhost:3001"
            ],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'", "https:"],
            childSrc: ["'none'"],
            workerSrc: ["'self'", "blob:"],
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    frameguard: { action: 'sameorigin' },
    noSniff: true,
    xssFilter: true,
    hidePoweredBy: true
});
export const apiRateLimit = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000')) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return req.path === '/api/health';
    }
});
export const aiChatRateLimit = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_AI_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_AI_MAX_REQUESTS || '10'),
    message: {
        error: 'Too many AI chat requests, please slow down.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_AI_WINDOW_MS || '60000')) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false
});
export const discordActivityHeaders = (req, res, next) => {
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization,x-discord-user-id,x-discord-instance-id');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};
export const validateInput = (req, res, next) => {
    const sanitizeString = (str) => {
        return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
            .replace(/on\w+\s*=\s*'[^']*'/gi, '');
    };
    if (req.body && typeof req.body === 'object') {
        const sanitizeObject = (obj) => {
            for (const key in obj) {
                if (typeof obj[key] === 'string') {
                    obj[key] = sanitizeString(obj[key]);
                }
                else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeObject(obj[key]);
                }
            }
        };
        sanitizeObject(req.body);
    }
    next();
};
export const validateDiscordUser = (req, res, next) => {
    const discordUserId = req.headers['x-discord-user-id'];
    const instanceId = req.headers['x-discord-instance-id'];
    if (!discordUserId || !instanceId) {
        return res.status(401).json({
            error: 'Discord user authentication required'
        });
    }
    req.discordContext = {
        userId: discordUserId,
        instanceId: instanceId
    };
    next();
};
export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(err.status || 500).json({
        error: isDevelopment ? err.message : 'Internal server error',
        ...(isDevelopment && { stack: err.stack })
    });
};
