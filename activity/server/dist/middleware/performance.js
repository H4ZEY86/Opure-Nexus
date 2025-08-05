import compression from 'compression';
export const compressionMiddleware = compression({
    threshold: 1024,
    level: 6,
    filter: (req, res) => {
        if (!req.headers['accept-encoding']?.includes('gzip')) {
            return false;
        }
        const contentType = res.getHeader('content-type');
        if (contentType) {
            const skipTypes = [
                'image/',
                'video/',
                'audio/',
                'application/zip',
                'application/gzip',
                'application/x-gzip'
            ];
            if (skipTypes.some(type => contentType.startsWith(type))) {
                return false;
            }
        }
        return compression.filter(req, res);
    }
});
export const cacheControl = (maxAge = 3600) => {
    return (req, res, next) => {
        if (req.path.startsWith('/api/')) {
            if (req.path === '/api/health') {
                res.setHeader('Cache-Control', 'no-cache');
            }
            else {
                res.setHeader('Cache-Control', 'private, max-age=60');
            }
        }
        else if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
            res.setHeader('Cache-Control', `public, max-age=${maxAge}, immutable`);
            res.setHeader('ETag', `"${Date.now()}"`);
        }
        else {
            res.setHeader('Cache-Control', 'public, max-age=300');
        }
        next();
    };
};
export const responseTime = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        res.setHeader('X-Response-Time', `${duration}ms`);
        if (duration > 1000) {
            console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
        }
    });
    next();
};
export const memoryMonitoring = (req, res, next) => {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const rssUsedMB = memUsage.rss / 1024 / 1024;
    if (heapUsedMB > 100) {
        console.warn(`High heap memory usage: ${heapUsedMB.toFixed(2)}MB`);
    }
    if (rssUsedMB > 512) {
        console.warn(`High RSS memory usage: ${rssUsedMB.toFixed(2)}MB`);
    }
    if (process.env.NODE_ENV === 'development') {
        res.setHeader('X-Memory-Heap', `${heapUsedMB.toFixed(2)}MB`);
        res.setHeader('X-Memory-RSS', `${rssUsedMB.toFixed(2)}MB`);
    }
    next();
};
let dbPool = null;
export const getDatabaseConnection = () => {
    if (!dbPool) {
        dbPool = {};
    }
    return dbPool;
};
export const assetOptimization = (req, res, next) => {
    if (req.path === '/' || req.path === '/index.html') {
        res.setHeader('Link', [
            '</assets/main.css>; rel=preload; as=style',
            '</assets/main.js>; rel=preload; as=script'
        ].join(', '));
    }
    const ext = req.path.split('.').pop();
    switch (ext) {
        case 'css':
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            break;
        case 'js':
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            break;
        case 'woff2':
            res.setHeader('Content-Type', 'font/woff2');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            break;
        case 'woff':
            res.setHeader('Content-Type', 'font/woff');
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            break;
    }
    next();
};
export const healthCheck = (req, res) => {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
        memory: {
            heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
            rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`,
            external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`
        },
        cpu: {
            usage: process.cpuUsage()
        },
        version: process.version,
        platform: process.platform,
        arch: process.arch
    };
    res.status(200).json(health);
};
export const requestLogger = (req, res, next) => {
    const start = Date.now();
    const { method, url, ip } = req;
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;
        let statusColor = '\x1b[32m';
        if (statusCode >= 400)
            statusColor = '\x1b[31m';
        else if (statusCode >= 300)
            statusColor = '\x1b[33m';
        console.log(`${statusColor}${method}\x1b[0m ${url} - ${statusColor}${statusCode}\x1b[0m - ${duration}ms - ${ip}`);
    });
    next();
};
