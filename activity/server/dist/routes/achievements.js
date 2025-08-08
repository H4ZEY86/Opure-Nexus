"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_validator_1 = require("express-validator");
const router = express_1.default.Router();
const achievementRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: 'Too many achievement requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});
router.use(achievementRateLimit);
router.get('/achievements', [
    (0, express_validator_1.query)('category').optional().isString(),
    (0, express_validator_1.query)('rarity').optional().isIn(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']),
    (0, express_validator_1.query)('tier').optional().isIn(['basic', 'advanced', 'expert', 'master', 'legendary']),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('search').optional().isString().isLength({ max: 100 }),
    (0, express_validator_1.query)('sort_by').optional().isIn(['newest', 'oldest', 'rarity', 'tier', 'tokens']),
    (0, express_validator_1.query)('sort_order').optional().isIn(['asc', 'desc'])
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        const { category, rarity, tier, page = 1, limit = 20, search, sort_by = 'newest', sort_order = 'desc' } = req.query;
        let conditions = ['a.is_active = true'];
        let params = [];
        if (category) {
            conditions.push('a.category = ?');
            params.push(category);
        }
        if (rarity) {
            conditions.push('a.rarity = ?');
            params.push(rarity);
        }
        if (tier) {
            conditions.push('a.tier = ?');
            params.push(tier);
        }
        if (search) {
            conditions.push('(a.name LIKE ? OR a.description LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }
        let orderBy = 'a.created_at DESC';
        switch (sort_by) {
            case 'newest':
                orderBy = `a.created_at ${sort_order === 'asc' ? 'ASC' : 'DESC'}`;
                break;
            case 'oldest':
                orderBy = `a.created_at ${sort_order === 'desc' ? 'DESC' : 'ASC'}`;
                break;
            case 'rarity':
                orderBy = `CASE a.rarity 
                   WHEN 'common' THEN 1 
                   WHEN 'uncommon' THEN 2 
                   WHEN 'rare' THEN 3 
                   WHEN 'epic' THEN 4 
                   WHEN 'legendary' THEN 5 
                   WHEN 'mythic' THEN 6 END ${sort_order === 'asc' ? 'ASC' : 'DESC'}`;
                break;
            case 'tier':
                orderBy = `a.tier ${sort_order === 'asc' ? 'ASC' : 'DESC'}`;
                break;
            case 'tokens':
                orderBy = `a.base_token_reward ${sort_order === 'asc' ? 'ASC' : 'DESC'}`;
                break;
        }
        const offset = (Number(page) - 1) * Number(limit);
        const whereClause = conditions.join(' AND ');
        const query = `
      SELECT a.*, ac.name as category_name, ac.icon as category_icon, ac.color_hex as category_color
      FROM achievements_v2 a
      LEFT JOIN achievement_categories ac ON a.category_id = ac.category_id
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
        params.push(Number(limit), offset);
        const achievements = await executeQuery(query, params);
        const countQuery = `
      SELECT COUNT(*) as total
      FROM achievements_v2 a
      WHERE ${whereClause}
    `;
        const countResult = await executeQuery(countQuery, params.slice(0, -2));
        const total = countResult[0]?.total || 0;
        res.json({
            success: true,
            data: achievements,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                hasMore: offset + achievements.length < total
            }
        });
    }
    catch (error) {
        console.error('Error fetching achievements:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch achievements' });
    }
});
router.get('/achievements/:id', [
    (0, express_validator_1.param)('id').isString().isLength({ min: 1, max: 100 })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        const { id } = req.params;
        const query = `
      SELECT a.*, ac.name as category_name, ac.icon as category_icon, ac.color_hex as category_color
      FROM achievements_v2 a
      LEFT JOIN achievement_categories ac ON a.category_id = ac.category_id
      WHERE a.achievement_id = ? AND a.is_active = true
    `;
        const achievements = await executeQuery(query, [id]);
        if (achievements.length === 0) {
            return res.status(404).json({ success: false, error: 'Achievement not found' });
        }
        const achievement = achievements[0];
        const dependencyQuery = `
      SELECT ad.prerequisite_id, a.name as prerequisite_name
      FROM achievement_dependencies ad
      JOIN achievements_v2 a ON ad.prerequisite_id = a.achievement_id
      WHERE ad.achievement_id = ?
    `;
        const dependencies = await executeQuery(dependencyQuery, [id]);
        const statsQuery = `
      SELECT 
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completions,
        AVG(quality_score) as average_quality
      FROM user_achievement_progress
      WHERE achievement_id = ?
    `;
        const stats = await executeQuery(statsQuery, [id]);
        res.json({
            success: true,
            data: {
                ...achievement,
                dependencies,
                stats: stats[0] || { total_attempts: 0, completions: 0, average_quality: 0 }
            }
        });
    }
    catch (error) {
        console.error('Error fetching achievement:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch achievement details' });
    }
});
router.get('/users/:userId/achievements', [
    (0, express_validator_1.param)('userId').isString(),
    (0, express_validator_1.query)('status').optional().isIn(['locked', 'active', 'completed', 'failed']),
    (0, express_validator_1.query)('category').optional().isString()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        const { userId } = req.params;
        const { status, category } = req.query;
        let conditions = ['a.is_active = true'];
        let params = [userId];
        if (status) {
            conditions.push('uap.status = ?');
            params.push(status);
        }
        if (category) {
            conditions.push('a.category = ?');
            params.push(category);
        }
        const whereClause = conditions.join(' AND ');
        const query = `
      SELECT 
        a.*,
        ac.name as category_name,
        ac.icon as category_icon,
        ac.color_hex as category_color,
        uap.progress_data,
        uap.current_values,
        uap.target_values,
        uap.completion_percentage,
        uap.status,
        uap.quality_score,
        uap.unlocked_at,
        uap.times_completed,
        uap.shared_count,
        COALESCE(uap.status, 'locked') as user_status
      FROM achievements_v2 a
      LEFT JOIN achievement_categories ac ON a.category_id = ac.category_id
      LEFT JOIN user_achievement_progress uap ON a.achievement_id = uap.achievement_id AND uap.user_id = ?
      WHERE ${whereClause}
      ORDER BY 
        CASE WHEN uap.status = 'completed' THEN 1 
             WHEN uap.status = 'active' THEN 2 
             ELSE 3 END,
        a.tier, a.created_at DESC
    `;
        const userAchievements = await executeQuery(query, params);
        const statsQuery = `
      SELECT 
        COUNT(CASE WHEN uap.status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN uap.status = 'active' THEN 1 END) as active_count,
        SUM(CASE WHEN uap.status = 'completed' THEN a.base_token_reward ELSE 0 END) as tokens_earned,
        AVG(CASE WHEN uap.status = 'completed' THEN uap.quality_score END) as average_quality
      FROM user_achievement_progress uap
      JOIN achievements_v2 a ON uap.achievement_id = a.achievement_id
      WHERE uap.user_id = ?
    `;
        const userStats = await executeQuery(statsQuery, [userId]);
        res.json({
            success: true,
            data: {
                achievements: userAchievements,
                stats: userStats[0] || { completed_count: 0, active_count: 0, tokens_earned: 0, average_quality: 0 }
            }
        });
    }
    catch (error) {
        console.error('Error fetching user achievements:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch user achievements' });
    }
});
router.post('/achievements/:id/share', [
    (0, express_validator_1.param)('id').isString(),
    (0, express_validator_1.body)('platform').isIn(['discord', 'twitter', 'facebook', 'reddit']),
    (0, express_validator_1.body)('userId').isString(),
    (0, express_validator_1.body)('shareText').optional().isString().isLength({ max: 500 })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        const { id } = req.params;
        const { platform, userId, shareText } = req.body;
        const verifyQuery = `
      SELECT uap.*, a.name, a.description 
      FROM user_achievement_progress uap
      JOIN achievements_v2 a ON uap.achievement_id = a.achievement_id
      WHERE uap.user_id = ? AND uap.achievement_id = ? AND uap.status = 'completed'
    `;
        const achievement = await executeQuery(verifyQuery, [userId, id]);
        if (achievement.length === 0) {
            return res.status(403).json({ success: false, error: 'Achievement not completed or not found' });
        }
        const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const insertQuery = `
      INSERT INTO achievement_shares (
        share_id, user_id, achievement_id, platform, share_text, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `;
        await executeQuery(insertQuery, [shareId, userId, id, platform, shareText || '']);
        const updateQuery = `
      UPDATE user_achievement_progress 
      SET shared_count = shared_count + 1
      WHERE user_id = ? AND achievement_id = ?
    `;
        await executeQuery(updateQuery, [userId, id]);
        await trackViralEvent('achievement_shared', {
            userId,
            achievementId: id,
            platform,
            shareId
        });
        res.json({
            success: true,
            data: {
                shareId,
                shareUrl: generateShareUrl(shareId, platform),
                viralBonus: 10
            }
        });
    }
    catch (error) {
        console.error('Error sharing achievement:', error);
        res.status(500).json({ success: false, error: 'Failed to share achievement' });
    }
});
router.get('/bounties', [
    (0, express_validator_1.query)('category').optional().isString(),
    (0, express_validator_1.query)('bounty_type').optional().isIn(['daily', 'weekly', 'community', 'skill', 'collaborative', 'event', 'seasonal', 'competitive']),
    (0, express_validator_1.query)('difficulty_min').optional().isInt({ min: 1, max: 10 }),
    (0, express_validator_1.query)('difficulty_max').optional().isInt({ min: 1, max: 10 }),
    (0, express_validator_1.query)('tokens_min').optional().isInt({ min: 0 }),
    (0, express_validator_1.query)('tokens_max').optional().isInt({ min: 0 }),
    (0, express_validator_1.query)('status').optional().isIn(['draft', 'active', 'completed', 'cancelled', 'expired']),
    (0, express_validator_1.query)('trending').optional().isBoolean(),
    (0, express_validator_1.query)('featured').optional().isBoolean(),
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 50 })
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        const { category, bounty_type, difficulty_min, difficulty_max, tokens_min, tokens_max, status = 'active', trending, featured, page = 1, limit = 20 } = req.query;
        let conditions = ['b.status = ?'];
        let params = [status];
        if (category) {
            conditions.push('b.category_id = ?');
            params.push(category);
        }
        if (bounty_type) {
            conditions.push('b.bounty_type = ?');
            params.push(bounty_type);
        }
        if (difficulty_min) {
            conditions.push('b.difficulty_level >= ?');
            params.push(Number(difficulty_min));
        }
        if (difficulty_max) {
            conditions.push('b.difficulty_level <= ?');
            params.push(Number(difficulty_max));
        }
        if (tokens_min) {
            conditions.push('b.token_pool >= ?');
            params.push(Number(tokens_min));
        }
        if (tokens_max) {
            conditions.push('b.token_pool <= ?');
            params.push(Number(tokens_max));
        }
        if (trending === 'true') {
            conditions.push('b.is_trending = true');
        }
        if (featured === 'true') {
            conditions.push('b.is_featured = true');
        }
        const offset = (Number(page) - 1) * Number(limit);
        const whereClause = conditions.join(' AND ');
        const query = `
      SELECT 
        b.*,
        bc.name as category_name,
        bc.icon as category_icon,
        bc.color_hex as category_color
      FROM bounties b
      LEFT JOIN bounty_categories bc ON b.category_id = bc.category_id
      WHERE ${whereClause}
      ORDER BY b.is_featured DESC, b.is_trending DESC, b.created_at DESC
      LIMIT ? OFFSET ?
    `;
        params.push(Number(limit), offset);
        const bounties = await executeQuery(query, params);
        const countQuery = `SELECT COUNT(*) as total FROM bounties b WHERE ${whereClause}`;
        const countResult = await executeQuery(countQuery, params.slice(0, -2));
        const total = countResult[0]?.total || 0;
        res.json({
            success: true,
            data: bounties,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                hasMore: offset + bounties.length < total
            }
        });
    }
    catch (error) {
        console.error('Error fetching bounties:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch bounties' });
    }
});
router.post('/bounties', [
    (0, express_validator_1.body)('title').isString().isLength({ min: 5, max: 200 }),
    (0, express_validator_1.body)('description').isString().isLength({ min: 10, max: 2000 }),
    (0, express_validator_1.body)('category_id').isString(),
    (0, express_validator_1.body)('bounty_type').isIn(['daily', 'weekly', 'community', 'skill', 'collaborative', 'event', 'seasonal', 'competitive']),
    (0, express_validator_1.body)('difficulty_level').isInt({ min: 1, max: 10 }),
    (0, express_validator_1.body)('token_pool').isInt({ min: 10 }),
    (0, express_validator_1.body)('objectives').isArray({ min: 1 }),
    (0, express_validator_1.body)('requirements').optional().isArray(),
    (0, express_validator_1.body)('max_participants').optional().isInt({ min: 1 }),
    (0, express_validator_1.body)('duration_hours').optional().isInt({ min: 1 }),
    (0, express_validator_1.body)('creatorId').isString()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        const { title, description, category_id, bounty_type, difficulty_level, token_pool, objectives, requirements = [], max_participants, duration_hours, creatorId } = req.body;
        const bountyId = `bounty_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        let endsAt = null;
        if (duration_hours) {
            const endTime = new Date();
            endTime.setHours(endTime.getHours() + duration_hours);
            endsAt = endTime.toISOString();
        }
        const insertQuery = `
      INSERT INTO bounties (
        bounty_id, title, description, category_id, creator_id, creator_type,
        bounty_type, difficulty_level, token_pool, objectives, requirements,
        max_participants, duration_hours, starts_at, ends_at, status, created_at
      ) VALUES (?, ?, ?, ?, ?, 'user', ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, 'active', datetime('now'))
    `;
        await executeQuery(insertQuery, [
            bountyId, title, description, category_id, creatorId,
            bounty_type, difficulty_level, token_pool,
            JSON.stringify(objectives), JSON.stringify(requirements),
            max_participants, duration_hours, endsAt
        ]);
        res.status(201).json({
            success: true,
            data: {
                bountyId,
                message: 'Bounty created successfully'
            }
        });
    }
    catch (error) {
        console.error('Error creating bounty:', error);
        res.status(500).json({ success: false, error: 'Failed to create bounty' });
    }
});
router.post('/bounties/:id/join', [
    (0, express_validator_1.param)('id').isString(),
    (0, express_validator_1.body)('userId').isString()
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        const { id } = req.params;
        const { userId } = req.body;
        const bountyQuery = `
      SELECT * FROM bounties 
      WHERE bounty_id = ? AND status = 'active'
    `;
        const bounties = await executeQuery(bountyQuery, [id]);
        if (bounties.length === 0) {
            return res.status(404).json({ success: false, error: 'Bounty not found or not active' });
        }
        const bounty = bounties[0];
        const existingQuery = `
      SELECT * FROM user_bounty_participation 
      WHERE user_id = ? AND bounty_id = ?
    `;
        const existing = await executeQuery(existingQuery, [userId, id]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, error: 'Already participating in this bounty' });
        }
        if (bounty.max_participants && bounty.current_participants >= bounty.max_participants) {
            return res.status(400).json({ success: false, error: 'Bounty is full' });
        }
        const participationId = `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const insertQuery = `
      INSERT INTO user_bounty_participation (
        participation_id, user_id, bounty_id, joined_at, status, 
        progress_data, completion_percentage
      ) VALUES (?, ?, ?, datetime('now'), 'active', '{}', 0.0)
    `;
        await executeQuery(insertQuery, [participationId, userId, id]);
        const updateQuery = `
      UPDATE bounties 
      SET current_participants = current_participants + 1
      WHERE bounty_id = ?
    `;
        await executeQuery(updateQuery, [id]);
        res.json({
            success: true,
            data: {
                participationId,
                message: 'Successfully joined bounty'
            }
        });
    }
    catch (error) {
        console.error('Error joining bounty:', error);
        res.status(500).json({ success: false, error: 'Failed to join bounty' });
    }
});
async function executeQuery(query, params = []) {
    return [];
}
async function trackViralEvent(eventType, data) {
    console.log(`Viral event: ${eventType}`, data);
}
function generateShareUrl(shareId, platform) {
    const baseUrl = process.env.BASE_URL || 'https://www.opure.uk';
    return `${baseUrl}/share/${shareId}?platform=${platform}`;
}
exports.default = router;
//# sourceMappingURL=achievements.js.map