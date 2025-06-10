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
let rooms = {}; // { roomId: { gameState, players: [socketId, socketId] } }
let waitingPlayer = null;

// Function to broadcast the state to all players in a room
const broadcastGameState = (roomId) => {
    const room = rooms[roomId];
    if (room) {
        room.players.forEach(playerId => {
            const state = room.gameState.getStateForPlayer(playerId);
            io.to(playerId).emit('gameState', state);
        });
    }
};

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    if (waitingPlayer) {
        // Start a new game
        const roomId = `game-${socket.id}-${waitingPlayer.id}`;
        const playerIds = [waitingPlayer.id, socket.id];
        const gameState = new GameState(playerIds);
        gameState.startNewGame();

        rooms[roomId] = { gameState, players: playerIds };

        // Join both players to the same room
        waitingPlayer.join(roomId);
        socket.join(roomId);

        // Notify players that the game has started
        io.to(roomId).emit('gameStart', { roomId, players: playerIds });

        // Send initial game state
        broadcastGameState(roomId);

        console.log(`Game started in room ${roomId} with players ${playerIds.join(' and ')}`);

        waitingPlayer = null; // Reset waiting player
    } else {
        // This is the first player, make them wait
        waitingPlayer = socket;
        socket.emit('waitingForPlayer', 'Waiting for another player to join...');
        console.log(`Player ${socket.id} is waiting for an opponent.`);
    }

    socket.on('playCard', ({ roomId, card, chosenSuit }) => {
        const room = rooms[roomId];
        if (room) {
            try {
                room.gameState.playCard(socket.id, card, chosenSuit);
                broadcastGameState(roomId);
            } catch (error) {
                socket.emit('gameError', { message: error.message });
            }
        }
    });

    socket.on('drawCard', ({ roomId }) => {
        const room = rooms[roomId];
        if (room) {
            try {
                room.gameState.drawCard(socket.id);
                broadcastGameState(roomId);
            } catch (error) {
                socket.emit('gameError', { message: error.message });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        if (waitingPlayer && waitingPlayer.id === socket.id) {
            waitingPlayer = null;
            console.log('Waiting player disconnected.');
        }

        // Find which room the player was in
        const roomId = Object.keys(rooms).find(id => rooms[id].players.includes(socket.id));
        if (roomId) {
            const room = rooms[roomId];
            // Notify the other player
            const otherPlayerId = room.players.find(id => id !== socket.id);
            if (otherPlayerId) {
                io.to(otherPlayerId).emit('opponentDisconnected', 'Your opponent has disconnected.');
            }
            // Clean up the room
            delete rooms[roomId];
            console.log(`Room ${roomId} closed.`);
        }
    });
});

server.listen(port, () => {
    console.log(`Crazy Eights backend listening at http://localhost:${port}`);
});
