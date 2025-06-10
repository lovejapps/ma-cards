// backend/server.js
const express = require('express');
const cors = require('cors');
const GameState = require('./gameState'); // Import the GameState class
const { Card, SUITS, RANKS } = require('./card'); // Import Card and SUITS for validation/creation

const app = express();
const port = 3000;

app.use(express.json()); // Middleware to parse JSON request bodies
app.use(cors());

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

app.get('/start', (req, res) => {
    const playerName = 'LoveJ';
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

    // Basic validation
    if (!cardToPlayData || cardToPlayData.suit === undefined || cardToPlayData.rank === undefined) {
        return res.status(400).json({ 
            message: "Invalid card data provided. Please provide both suit and rank.",
            errorType: "INVALID_CARD_DATA"
        });
    }

    try {
        // Validate card values against known valid suits and ranks
        if (!SUITS.includes(cardToPlayData.suit)) {
            return res.status(400).json({
                message: `Invalid suit: ${cardToPlayData.suit}. Valid suits are: ${SUITS.join(', ')}`,
                errorType: "INVALID_SUIT"
            });
        }
        if (!RANKS.includes(cardToPlayData.rank)) {
            return res.status(400).json({
                message: `Invalid rank: ${cardToPlayData.rank}. Valid ranks are: ${RANKS.join(', ')}`,
                errorType: "INVALID_RANK"
            });
        }

        // Create a Card object from the received data
        const cardToPlay = new Card(cardToPlayData.suit, cardToPlayData.rank);

        // Check if the player has the card in their hand
        const cardInHand = currentGame.playerHand.find(card => card.equals(cardToPlay));
        if (!cardInHand) {
            return res.status(400).json({ 
                message: `You don't have the ${cardToPlay.toString()} in your hand.`,
                errorType: "CARD_NOT_IN_HAND"
            });
        }

        // If playing an 8, ensure a valid suit is chosen
        if (cardToPlay.rank === '8' && (!chosenSuit || !SUITS.includes(chosenSuit))) {
            return res.status(400).json({
                message: `When playing an 8, you must choose a valid suit. Valid suits are: ${SUITS.join(', ')}`,
                errorType: "INVALID_SUIT_CHOICE"
            });
        }

        // Try to play the card
        try {
            currentGame.playCard('player', cardToPlay, chosenSuit);
        } catch (gameError) {
            return res.status(400).json({
                message: `Invalid move: ${gameError.message}`,
                errorType: "INVALID_MOVE"
            });
        }

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

// Endpoint for the player to end their turn
app.post('/end-turn', (req, res) => {
    if (!currentGame) {
        return res.status(404).json({ message: "No game in progress. Start a new game using POST /start." });
    }

    if (currentGame.gameOver) {
        return res.status(400).json({ message: `Game is already over. ${currentGame.winner} won.` });
    }

    try {
        // App takes its turn
        currentGame.appPlayTurn();
        res.json(currentGame.getCurrentState());
    } catch (error) {
        res.status(400).json({ message: `Error during app's turn: ${error.message}` });
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
