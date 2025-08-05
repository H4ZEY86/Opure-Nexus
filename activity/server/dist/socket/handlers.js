"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketHandlers = setupSocketHandlers;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
const RoomManager_1 = require("../services/RoomManager");
const MusicManager_1 = require("../services/MusicManager");
const gameHandlers_1 = require("./gameHandlers");
const roomManager = new RoomManager_1.RoomManager();
const musicManager = new MusicManager_1.MusicManager();
function setupSocketHandlers(io) {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication token required'));
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            socket.username = decoded.username;
            socket.data = {
                userId: decoded.userId,
                username: decoded.username,
                avatar: decoded.avatar,
                globalName: decoded.globalName,
            };
            next();
        }
        catch (error) {
            logger_1.logger.error('Socket authentication failed:', error);
            next(new Error('Invalid authentication token'));
        }
    });
    io.on('connection', (socket) => {
        logger_1.logger.info(`User connected: ${socket.username} (${socket.userId})`);
        (0, gameHandlers_1.setupGameHandlers)(io, socket);
        socket.on('join_room', async (data) => {
            try {
                const { instanceId, channelId } = data;
                const roomId = `instance_${instanceId}`;
                if (socket.roomId) {
                    await socket.leave(socket.roomId);
                    roomManager.removeUser(socket.roomId, socket.userId);
                }
                await socket.join(roomId);
                socket.roomId = roomId;
                const room = roomManager.addUser(roomId, {
                    id: socket.userId,
                    username: socket.username,
                    avatar: socket.data.avatar,
                    globalName: socket.data.globalName,
                    socketId: socket.id,
                    joinedAt: new Date(),
                });
                socket.to(roomId).emit('user_joined', {
                    user: room.users.find(u => u.id === socket.userId),
                    userCount: room.users.length,
                });
                socket.emit('room_joined', {
                    roomId,
                    users: room.users,
                    musicState: musicManager.getRoomState(roomId),
                });
                logger_1.logger.info(`User ${socket.username} joined room ${roomId}`);
            }
            catch (error) {
                logger_1.logger.error('Failed to join room:', error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });
        socket.on('music_play', async (data) => {
            try {
                if (!socket.roomId) {
                    socket.emit('error', { message: 'Not in a room' });
                    return;
                }
                const musicState = await musicManager.playTrack(socket.roomId, data, socket.userId);
                io.to(socket.roomId).emit('music_state_update', musicState);
                logger_1.logger.info(`Music played in room ${socket.roomId}: ${data.title || data.url}`);
            }
            catch (error) {
                logger_1.logger.error('Failed to play music:', error);
                socket.emit('error', { message: 'Failed to play music' });
            }
        });
        socket.on('music_pause', async () => {
            try {
                if (!socket.roomId) {
                    socket.emit('error', { message: 'Not in a room' });
                    return;
                }
                const musicState = await musicManager.pauseTrack(socket.roomId, socket.userId);
                io.to(socket.roomId).emit('music_state_update', musicState);
            }
            catch (error) {
                logger_1.logger.error('Failed to pause music:', error);
                socket.emit('error', { message: 'Failed to pause music' });
            }
        });
        socket.on('music_resume', async () => {
            try {
                if (!socket.roomId) {
                    socket.emit('error', { message: 'Not in a room' });
                    return;
                }
                const musicState = await musicManager.resumeTrack(socket.roomId, socket.userId);
                io.to(socket.roomId).emit('music_state_update', musicState);
            }
            catch (error) {
                logger_1.logger.error('Failed to resume music:', error);
                socket.emit('error', { message: 'Failed to resume music' });
            }
        });
        socket.on('music_seek', async (data) => {
            try {
                if (!socket.roomId) {
                    socket.emit('error', { message: 'Not in a room' });
                    return;
                }
                const musicState = await musicManager.seekTrack(socket.roomId, data.position, socket.userId);
                io.to(socket.roomId).emit('music_state_update', musicState);
            }
            catch (error) {
                logger_1.logger.error('Failed to seek music:', error);
                socket.emit('error', { message: 'Failed to seek music' });
            }
        });
        socket.on('music_volume', async (data) => {
            try {
                if (!socket.roomId) {
                    socket.emit('error', { message: 'Not in a room' });
                    return;
                }
                const musicState = await musicManager.setVolume(socket.roomId, data.volume, socket.userId);
                io.to(socket.roomId).emit('music_state_update', musicState);
            }
            catch (error) {
                logger_1.logger.error('Failed to set volume:', error);
                socket.emit('error', { message: 'Failed to set volume' });
            }
        });
        socket.on('playlist_add', async (data) => {
            try {
                if (!socket.roomId) {
                    socket.emit('error', { message: 'Not in a room' });
                    return;
                }
                const playlist = await musicManager.addToPlaylist(socket.roomId, data, socket.userId);
                io.to(socket.roomId).emit('playlist_update', playlist);
            }
            catch (error) {
                logger_1.logger.error('Failed to add to playlist:', error);
                socket.emit('error', { message: 'Failed to add to playlist' });
            }
        });
        socket.on('playlist_remove', async (data) => {
            try {
                if (!socket.roomId) {
                    socket.emit('error', { message: 'Not in a room' });
                    return;
                }
                const playlist = await musicManager.removeFromPlaylist(socket.roomId, data.index, socket.userId);
                io.to(socket.roomId).emit('playlist_update', playlist);
            }
            catch (error) {
                logger_1.logger.error('Failed to remove from playlist:', error);
                socket.emit('error', { message: 'Failed to remove from playlist' });
            }
        });
        socket.on('sync_request', () => {
            if (socket.roomId) {
                const musicState = musicManager.getRoomState(socket.roomId);
                socket.emit('sync_response', {
                    ...musicState,
                    serverTime: Date.now(),
                });
            }
        });
        socket.on('disconnect', (reason) => {
            logger_1.logger.info(`User disconnected: ${socket.username} (${socket.userId}) - ${reason}`);
            if (socket.roomId && socket.userId) {
                const room = roomManager.removeUser(socket.roomId, socket.userId);
                if (room) {
                    socket.to(socket.roomId).emit('user_left', {
                        userId: socket.userId,
                        userCount: room.users.length,
                    });
                    if (room.users.length === 0) {
                        roomManager.removeRoom(socket.roomId);
                        musicManager.stopRoom(socket.roomId);
                    }
                }
            }
        });
        socket.on('error', (error) => {
            logger_1.logger.error(`Socket error for user ${socket.username}:`, error);
        });
    });
    setInterval(() => {
        const activeRooms = roomManager.getActiveRooms();
        activeRooms.forEach(roomId => {
            const musicState = musicManager.getRoomState(roomId);
            if (musicState.isPlaying) {
                io.to(roomId).emit('music_sync', {
                    ...musicState,
                    serverTime: Date.now(),
                });
            }
        });
    }, 5000);
    logger_1.logger.info('Socket.IO handlers initialized');
}
//# sourceMappingURL=handlers.js.map