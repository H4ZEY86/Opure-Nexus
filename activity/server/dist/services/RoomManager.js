"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
class RoomManager {
    constructor() {
        this.rooms = new Map();
    }
    createRoom(name, type, creator, settings) {
        const room = {
            id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            type,
            users: [creator],
            settings: {
                max_users: 20,
                private: false,
                ...settings
            },
            created_at: new Date()
        };
        this.rooms.set(room.id, room);
        console.log(`Room created: ${room.id} by ${creator.username}`);
        return room;
    }
    joinRoom(roomId, user) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return false;
        }
        if (room.users.length >= room.settings.max_users) {
            return false;
        }
        if (room.users.find(u => u.id === user.id)) {
            return true;
        }
        room.users.push(user);
        console.log(`User ${user.username} joined room ${roomId}`);
        return true;
    }
    leaveRoom(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return false;
        }
        const userIndex = room.users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return false;
        }
        room.users.splice(userIndex, 1);
        console.log(`User ${userId} left room ${roomId}`);
        if (room.users.length === 0) {
            this.rooms.delete(roomId);
            console.log(`Room ${roomId} deleted (empty)`);
        }
        return true;
    }
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    getRooms() {
        return Array.from(this.rooms.values());
    }
    getRoomsByType(type) {
        return Array.from(this.rooms.values()).filter(room => room.type === type);
    }
    getUserRooms(userId) {
        return Array.from(this.rooms.values()).filter(room => room.users.some(user => user.id === userId));
    }
    addUser(roomId, user) {
        let room = this.rooms.get(roomId);
        if (!room) {
            room = {
                id: roomId,
                name: `Room ${roomId}`,
                type: 'chat',
                users: [],
                settings: {
                    max_users: 50,
                    private: false
                },
                created_at: new Date()
            };
            this.rooms.set(roomId, room);
        }
        if (!room.users.find(u => u.id === user.id)) {
            room.users.push(user);
            console.log(`User ${user.username} added to room ${roomId}`);
        }
        return room;
    }
    removeUser(roomId, userId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return null;
        }
        const userIndex = room.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            room.users.splice(userIndex, 1);
            console.log(`User ${userId} removed from room ${roomId}`);
        }
        return room;
    }
    removeRoom(roomId) {
        const deleted = this.rooms.delete(roomId);
        if (deleted) {
            console.log(`Room ${roomId} removed`);
        }
        return deleted;
    }
    getActiveRooms() {
        return Array.from(this.rooms.keys()).filter(roomId => {
            const room = this.rooms.get(roomId);
            return room && room.users.length > 0;
        });
    }
}
exports.RoomManager = RoomManager;
//# sourceMappingURL=RoomManager.js.map