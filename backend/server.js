// backend/server.js
const express = require('express');
const GameState = require('./gameState'); // Import the GameState class
const { Card, SUITS } = require('./card'); // Import Card and SUITS for validation/creation

const app = express();
const port = 3000;

app.use(express.json()); // Middleware to parse JSON request bodies

// Simple in-memory storage for the game state
// In a real application, you might use sessions or a database
let currentGame = null;

// Endpoint to start a new game
app.post('/start', (req, res) => {
    const playerName = req.body.playerName || 'Player';
    currentGame = new GameState(playerName);
    currentGame.startNewGame();
    res.json(currentGame.getCurrentState());
});

// Endpoint to get the current game state
app.get('/state', (req, res) => {
    if (!currentGame) {
        return res.status(404).json({ message: "No game in progress. Start a new game using POST /start." });
    }
    res.json(currentGame.getCurrentState());
});


// Endpoint for the player to play a card
app.post('/play', (req, res) => {
    if (!currentGame) {
        return res.status(404).json({ message: "No game in progress. Start a new game using POST /start." });
    }

    if (currentGame.gameOver) {
         return res.status(400).json({ message: `Game is already over. ${currentGame.winner} won.` });
    }

    const { card: cardToPlayData, chosenSuit } = req.body; // Expecting { card: { suit: '...', rank: '...' }, chosenSuit: '...' }

    if (!cardToPlayData || cardToPlayData.suit === undefined || cardToPlayData.rank === undefined) {
         return res.status(400).json({ message: "Invalid card data provided." });
    }

    try {
        // Create a Card object from the received data
        const cardToPlay = new Card(cardToPlayData.suit, cardToPlayData.rank);

        // Find the card in the player's hand to ensure they have it
         const cardInHand = currentGame.playerHand.find(card => card.equals(cardToPlay));
         if (!cardInHand) {
             return res.status(400).json({ message: "Card not found in player's hand." });
         }


        // Validate and play the card
        currentGame.playCard('player', cardToPlay, chosenSuit);

        // After player plays, the app takes its turn (if game not over)
        if (!currentGame.gameOver) {
             currentGame.appPlayTurn();
        }


        res.json(currentGame.getCurrentState());

    } catch (error) {
        res.status(400).json({ message: `Error playing card: ${error.message}` });
    }
});

// Endpoint for the player to draw a card
app.post('/draw', (req, res) => {
     if (!currentGame) {
        return res.status(404).json({ message: "No game in progress. Start a new game using POST /start." });
    }

     if (currentGame.gameOver) {
         return res.status(400).json({ message: `Game is already over. ${currentGame.winner} won.` });
     }

     try {
         const drawnCard = currentGame.drawCard('player');
          // After drawing, it's still the player's turn to see if they can play the drawn card
         res.json(currentGame.getCurrentState());
     } catch (error) {
         res.status(400).json({ message: `Error drawing card: ${error.message}` });
     }
});


// Basic error handling (optional)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


app.listen(port, () => {
    console.log(`Crazy Eights backend listening at http://localhost:${port}`);
});
