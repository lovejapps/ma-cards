// backend/server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const GameState = require('./gameState');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Be more specific in production
        methods: ["GET", "POST"]
    }
});

const port = 3000;

// In-memory storage for game rooms
let rooms = {}; // { roomId: { gameState, players: { socketId: playerName } } }

// Function to broadcast the state to all players in a room
const broadcastGameState = (roomId) => {
    const room = rooms[roomId];
    if (room) {
        Object.keys(room.players).forEach(playerId => {
            const state = room.gameState.getStateForPlayer(playerId);
            io.to(playerId).emit('gameState', state);
        });
    }
};

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    socket.on('createRoom', ({ playerName }) => {
        const roomId = `game-${Math.random().toString(36).substr(2, 9)}`;
        socket.join(roomId);

        const gameState = new GameState([{ id: socket.id, name: playerName }]);
        rooms[roomId] = { 
            gameState,
            players: { [socket.id]: playerName },
            hostId: socket.id
        };

        socket.emit('roomCreated', { roomId, playerId: socket.id, playerName });
        console.log(`Player ${playerName} (${socket.id}) created room ${roomId}`);
    });

    socket.on('joinRoom', ({ roomId, playerName }) => {
        const room = rooms[roomId];
        if (room && room.gameState.turn === null) {
            socket.join(roomId);
            room.players[socket.id] = playerName;
            room.gameState.addPlayer({ id: socket.id, name: playerName });

            console.log(`Player ${playerName} (${socket.id}) joined room ${roomId}`);
            // Notify all players in the room about the new player
            io.to(roomId).emit('playerJoined', { players: room.players, hostId: room.hostId });
        } else {
            socket.emit('gameError', { message: 'Room not found or is full.' });
        }
    });

    socket.on('startGame', ({ roomId }) => {
        const room = rooms[roomId];
        if (room && room.hostId === socket.id) {
            if (Object.keys(room.players).length >= 2) {
                room.gameState.startNewGame();
                io.to(roomId).emit('gameStart', { roomId, players: room.players });
                broadcastGameState(roomId);
                console.log(`Game started in room ${roomId} by host ${socket.id}`);
            } else {
                socket.emit('gameError', { message: 'Not enough players to start the game.' });
            }
        } else {
            socket.emit('gameError', { message: 'Only the host can start the game.' });
        }
    });

    socket.on('playCard', ({ roomId, card, chosenSuit }) => {
        const room = rooms[roomId];
        if (room) {
            const result = room.gameState.playCard(socket.id, card, chosenSuit);
            if (result.success) {
                broadcastGameState(roomId);
            } else {
                socket.emit('invalidMove', { message: result.message });
            }
        }
    });

    socket.on('drawCard', ({ roomId }) => {
        const room = rooms[roomId];
        if (room) {
            const result = room.gameState.drawCard(socket.id);
            if (result.success) {
                broadcastGameState(roomId);
            } else {
                socket.emit('invalidMove', { message: result.message });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        // Find which room the player was in
        const roomId = Object.keys(rooms).find(id => rooms[id] && rooms[id].players[socket.id]);

        if (roomId) {
            const room = rooms[roomId];
            const playerName = room.players[socket.id];
            
            // Remove player from room's player list and game state
            delete room.players[socket.id];
            room.gameState.removePlayer(socket.id);

            console.log(`Player ${playerName} (${socket.id}) left room ${roomId}`);

            // If the room is now empty, delete it
            if (Object.keys(room.players).length === 0) {
                delete rooms[roomId];
                console.log(`Room ${roomId} is empty and has been closed.`);
                return;
            }

            // If the host disconnects before the game starts, assign a new host
            if (room.hostId === socket.id && room.gameState.turn === null) {
                room.hostId = Object.keys(room.players)[0]; // Assign new host
            }

            // If game hasn't started, just update the lobby
            if (room.gameState.turn === null) {
                io.to(roomId).emit('playerJoined', { players: room.players, hostId: room.hostId });
            }
            // If game is active and there are enough players, continue
            else if (Object.keys(room.players).length >= 2) {
                broadcastGameState(roomId);
            }
            // Otherwise, not enough players to continue, end the game
            else {
                room.gameState.endGame();
                io.to(roomId).emit('opponentDisconnected', 'The last opponent has disconnected. The game has ended.');
            }
        }
    });
});

server.listen(port, () => {
    console.log(`Crazy Eights backend listening at http://localhost:${port}`);
});
