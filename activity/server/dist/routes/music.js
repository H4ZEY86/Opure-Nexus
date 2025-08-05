"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.musicRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const validation_1 = require("../middleware/validation");
const router = (0, express_1.Router)();
exports.musicRouter = router;
const addTrackSchema = zod_1.z.object({
    url: zod_1.z.string().min(1, 'Track URL is required'),
    title: zod_1.z.string().optional()
});
const controlSchema = zod_1.z.object({
    action: zod_1.z.enum(['play', 'pause', 'stop', 'skip', 'previous'])
});
router.get('/status', async (req, res) => {
    try {
        const musicStatus = {
            playing: false,
            current_track: null,
            queue: [],
            volume: 50,
            repeat: false,
            shuffle: false
        };
        res.json(musicStatus);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get music status' });
    }
});
router.get('/queue', async (req, res) => {
    try {
        const queue = [];
        res.json({ queue });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get music queue' });
    }
});
router.post('/queue', (0, validation_1.validateRequest)(addTrackSchema), async (req, res) => {
    try {
        const { url, title } = req.body;
        const track = {
            id: Date.now().toString(),
            url,
            title: title || 'Unknown Track',
            duration: null,
            added_by: req.body.user_id || 'unknown'
        };
        res.json({ success: true, track });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to add track to queue' });
    }
});
router.post('/control', (0, validation_1.validateRequest)(controlSchema), async (req, res) => {
    try {
        const { action } = req.body;
        console.log(`Music control: ${action}`);
        res.json({ success: true, action });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to control playback' });
    }
});
//# sourceMappingURL=music.js.map