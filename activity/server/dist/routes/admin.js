"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = express_1.default.Router();
const adminRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many admin requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});
const adminAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Admin token required' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'fallback-secret');
        const adminUser = await checkAdminPermissions(decoded.userId);
        if (!adminUser) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        req.admin = adminUser;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid admin token' });
    }
};
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({ error: 'Admin authentication required' });
        }
        if (req.admin.isSuperAdmin || req.admin.permissions.includes(permission) || req.admin.permissions.includes('admin.all')) {
            next();
        }
        else {
            res.status(403).json({ error: `Permission required: ${permission}` });
        }
    };
};
async function checkAdminPermissions(userId) {
    try {
        const user = await getUserById(userId);
        if (!user)
            return null;
        const hasAdminRole = user.roles?.includes('admin') || user.roles?.includes('super_admin');
        if (!hasAdminRole)
            return null;
        return {
            userId: user.user_id,
            username: user.username,
            permissions: getPermissionsForRoles(user.roles),
            isAdmin: true,
            isSuperAdmin: user.roles?.includes('super_admin') || false
        };
    }
    catch (error) {
        console.error('Error checking admin permissions:', error);
        return null;
    }
}
function getPermissionsForRoles(roles) {
    const permissions = [];
    if (roles.includes('super_admin')) {
        permissions.push('admin.all');
    }
    if (roles.includes('admin') || roles.includes('super_admin')) {
        permissions.push('admin.overview', 'admin.users', 'admin.economy', 'admin.games', 'admin.ai', 'admin.discord', 'admin.moderation', 'admin.analytics', 'admin.monitoring', 'admin.audit', 'admin.settings');
    }
    return permissions;
}
async function getUserById(userId) {
    return null;
}
async function getAllUsers(filters = {}) {
    return [];
}
async function getUserStats() {
    return {
        totalUsers: 0,
        activeUsers: 0,
        premiumUsers: 0,
        bannedUsers: 0,
        newUsersToday: 0,
        avgTokenBalance: 0,
        topSpenders: [],
        recentActivity: []
    };
}
async function getTokenStats(timeRange) {
    return {
        totalSupply: 0,
        totalInCirculation: 0,
        dailyMinted: 0,
        dailyBurned: 0,
        avgBalance: 0,
        medianBalance: 0,
        inflationRate: 0,
        deflationRate: 0
    };
}
async function getMarketplaceStats(timeRange) {
    return {
        totalListings: 0,
        activeListings: 0,
        totalSales: 0,
        dailySales: 0,
        avgPrice: 0,
        topSellers: [],
        topBuyers: [],
        categoryBreakdown: []
    };
}
router.use(adminRateLimit);
router.get('/stats', adminAuth, requirePermission('admin.overview'), async (req, res) => {
    try {
        const [userStats, tokenStats, marketplaceStats] = await Promise.all([
            getUserStats(),
            getTokenStats('1d'),
            getMarketplaceStats('1d')
        ]);
        const stats = {
            totalUsers: userStats.totalUsers,
            activeUsers24h: userStats.activeUsers,
            totalTokens: tokenStats.totalInCirculation,
            dailyTokenTransactions: tokenStats.dailyMinted + tokenStats.dailyBurned,
            totalGames: await getGameCount(),
            activeGameSessions: await getActiveGameSessions(),
            pendingReports: await getPendingReportsCount(),
            systemHealth: await getSystemHealth(),
            aiModelStatus: 'online',
            discordBotStatus: 'online'
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ error: 'Failed to fetch admin statistics' });
    }
});
router.get('/notifications', adminAuth, requirePermission('admin.overview'), async (req, res) => {
    try {
        const notifications = await getAdminNotifications();
        res.json(notifications);
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});
router.get('/users', adminAuth, requirePermission('admin.users'), async (req, res) => {
    try {
        const { page = 1, limit = 25, search, filter, sort } = req.query;
        const filters = {
            search: search,
            filter: filter,
            sort: sort,
            page: parseInt(page),
            limit: parseInt(limit)
        };
        const users = await getAllUsers(filters);
        res.json({ users });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
router.get('/users/stats', adminAuth, requirePermission('admin.users'), async (req, res) => {
    try {
        const stats = await getUserStats();
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
});
router.post('/users/:userId/action', adminAuth, requirePermission('admin.users'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { action, data } = req.body;
        const adminUser = req.admin;
        await logAdminAction(adminUser.userId, 'user_action', {
            targetUserId: userId,
            action,
            data,
            timestamp: new Date().toISOString()
        });
        let result;
        switch (action) {
            case 'ban':
                result = await banUser(userId, data);
                break;
            case 'unban':
                result = await unbanUser(userId);
                break;
            case 'gift_tokens':
                result = await giftTokens(userId, data.amount, data.reason);
                break;
            case 'gift_premium':
                result = await giftPremium(userId, data.duration);
                break;
            case 'reset_progress':
                result = await resetUserProgress(userId);
                break;
            case 'message':
                result = await sendUserMessage(userId, data.message);
                break;
            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
        res.json({ success: true, result });
    }
    catch (error) {
        console.error('Error performing user action:', error);
        res.status(500).json({ error: 'Failed to perform user action' });
    }
});
router.post('/users/bulk-action', adminAuth, requirePermission('admin.users'), async (req, res) => {
    try {
        const { action, userIds, data } = req.body;
        const adminUser = req.admin;
        await logAdminAction(adminUser.userId, 'bulk_user_action', {
            targetUserIds: userIds,
            action,
            data,
            timestamp: new Date().toISOString()
        });
        const results = [];
        for (const userId of userIds) {
            try {
                let result;
                switch (action) {
                    case 'gift_tokens':
                        result = await giftTokens(userId, data.amount, data.reason || 'Bulk admin gift');
                        break;
                    case 'send_message':
                        result = await sendUserMessage(userId, data.message);
                        break;
                    case 'add_role':
                        result = await addUserRole(userId, data.role);
                        break;
                    default:
                        result = { error: 'Invalid action' };
                }
                results.push({ userId, result });
            }
            catch (error) {
                results.push({ userId, error: error.message });
            }
        }
        res.json({ success: true, results });
    }
    catch (error) {
        console.error('Error performing bulk user action:', error);
        res.status(500).json({ error: 'Failed to perform bulk user action' });
    }
});
router.get('/users/export', adminAuth, requirePermission('admin.users'), async (req, res) => {
    try {
        const format = req.query.format || 'csv';
        const users = await getAllUsers();
        if (format === 'csv') {
            const csv = convertUsersToCSV(users);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
            res.send(csv);
        }
        else if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename=users_export.json');
            res.json(users);
        }
        else {
            res.status(400).json({ error: 'Invalid export format' });
        }
    }
    catch (error) {
        console.error('Error exporting users:', error);
        res.status(500).json({ error: 'Failed to export users' });
    }
});
router.get('/economy/tokens/stats', adminAuth, requirePermission('admin.economy'), async (req, res) => {
    try {
        const timeRange = req.query.timeRange || '7d';
        const stats = await getTokenStats(timeRange);
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching token stats:', error);
        res.status(500).json({ error: 'Failed to fetch token statistics' });
    }
});
router.get('/economy/marketplace/stats', adminAuth, requirePermission('admin.economy'), async (req, res) => {
    try {
        const timeRange = req.query.timeRange || '7d';
        const stats = await getMarketplaceStats(timeRange);
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching marketplace stats:', error);
        res.status(500).json({ error: 'Failed to fetch marketplace statistics' });
    }
});
router.get('/economy/transactions', adminAuth, requirePermission('admin.economy'), async (req, res) => {
    try {
        const { limit = 100, timeRange = '7d', type } = req.query;
        const transactions = await getTokenTransactions({
            limit: parseInt(limit),
            timeRange: timeRange,
            type: type
        });
        res.json({ transactions });
    }
    catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});
router.get('/economy/marketplace/listings', adminAuth, requirePermission('admin.economy'), async (req, res) => {
    try {
        const { limit = 100, status } = req.query;
        const listings = await getMarketplaceListings({
            limit: parseInt(limit),
            status: status
        });
        res.json({ listings });
    }
    catch (error) {
        console.error('Error fetching marketplace listings:', error);
        res.status(500).json({ error: 'Failed to fetch marketplace listings' });
    }
});
router.post('/economy/tokens/mint', adminAuth, requirePermission('admin.economy'), async (req, res) => {
    try {
        const { amount, reason } = req.body;
        const adminUser = req.admin;
        await logAdminAction(adminUser.userId, 'token_mint', {
            amount,
            reason,
            timestamp: new Date().toISOString()
        });
        const result = await mintTokens(amount, reason, adminUser.userId);
        res.json({ success: true, result });
    }
    catch (error) {
        console.error('Error minting tokens:', error);
        res.status(500).json({ error: 'Failed to mint tokens' });
    }
});
router.post('/economy/tokens/burn', adminAuth, requirePermission('admin.economy'), async (req, res) => {
    try {
        const { amount, reason } = req.body;
        const adminUser = req.admin;
        await logAdminAction(adminUser.userId, 'token_burn', {
            amount,
            reason,
            timestamp: new Date().toISOString()
        });
        const result = await burnTokens(amount, reason, adminUser.userId);
        res.json({ success: true, result });
    }
    catch (error) {
        console.error('Error burning tokens:', error);
        res.status(500).json({ error: 'Failed to burn tokens' });
    }
});
router.patch('/economy/marketplace/listings/:listingId/price', adminAuth, requirePermission('admin.economy'), async (req, res) => {
    try {
        const { listingId } = req.params;
        const { price } = req.body;
        const adminUser = req.admin;
        await logAdminAction(adminUser.userId, 'price_adjustment', {
            listingId,
            newPrice: price,
            timestamp: new Date().toISOString()
        });
        const result = await adjustListingPrice(listingId, price);
        res.json({ success: true, result });
    }
    catch (error) {
        console.error('Error adjusting listing price:', error);
        res.status(500).json({ error: 'Failed to adjust listing price' });
    }
});
router.get('/audit/logs', adminAuth, requirePermission('admin.audit'), async (req, res) => {
    try {
        const { page = 1, limit = 50, action, adminId, startDate, endDate } = req.query;
        const filters = {
            page: parseInt(page),
            limit: parseInt(limit),
            action: action,
            adminId: adminId,
            startDate: startDate,
            endDate: endDate
        };
        const logs = await getAuditLogs(filters);
        res.json(logs);
    }
    catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});
router.get('/system/health', adminAuth, requirePermission('admin.monitoring'), async (req, res) => {
    try {
        const health = await getSystemHealth();
        res.json(health);
    }
    catch (error) {
        console.error('Error fetching system health:', error);
        res.status(500).json({ error: 'Failed to fetch system health' });
    }
});
router.get('/system/metrics', adminAuth, requirePermission('admin.monitoring'), async (req, res) => {
    try {
        const metrics = await getSystemMetrics();
        res.json(metrics);
    }
    catch (error) {
        console.error('Error fetching system metrics:', error);
        res.status(500).json({ error: 'Failed to fetch system metrics' });
    }
});
async function getGameCount() {
    return 0;
}
async function getActiveGameSessions() {
    return 0;
}
async function getPendingReportsCount() {
    return 0;
}
async function getSystemHealth() {
    return 'healthy';
}
async function getAdminNotifications() {
    return [];
}
async function banUser(userId, data) {
    return { success: true };
}
async function unbanUser(userId) {
    return { success: true };
}
async function giftTokens(userId, amount, reason) {
    return { success: true };
}
async function giftPremium(userId, duration) {
    return { success: true };
}
async function resetUserProgress(userId) {
    return { success: true };
}
async function sendUserMessage(userId, message) {
    return { success: true };
}
async function addUserRole(userId, role) {
    return { success: true };
}
async function convertUsersToCSV(users) {
    return 'CSV data';
}
async function getTokenTransactions(filters) {
    return [];
}
async function getMarketplaceListings(filters) {
    return [];
}
async function mintTokens(amount, reason, adminId) {
    return { success: true };
}
async function burnTokens(amount, reason, adminId) {
    return { success: true };
}
async function adjustListingPrice(listingId, price) {
    return { success: true };
}
async function getAuditLogs(filters) {
    return { logs: [], total: 0 };
}
async function getSystemMetrics() {
    return {};
}
async function logAdminAction(adminId, action, data) {
    console.log(`Admin ${adminId} performed ${action}:`, data);
}
exports.default = router;
//# sourceMappingURL=admin.js.map