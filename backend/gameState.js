// backend/gameState.js
const Deck = require('./deck');
const { Card, SUITS } = require('./card');

class GameState {
    constructor(playerIds) {
        this.playerIds = playerIds; // Array of player socket IDs
        this.players = {}; // Object to hold player data, keyed by ID
        this.deck = new Deck();
        this.deck.shuffle();
        this.discardPile = [];
        this.currentSuit = null; // Used when an 8 is played
        this.gameOver = false;
        this.winner = null;
        this.message = "";
        this.turn = null; // Who's turn is it? (player ID)

        // Initialize players
        this.playerIds.forEach(playerId => {
            this.players[playerId] = {
                hand: [],
                id: playerId
            };
        });
    }

    startNewGame() {
        // Deal initial hands (e.g., 8 cards each)
        try {
            this.playerIds.forEach(playerId => {
                this.players[playerId].hand = this.deck.deal(8);
            });
        } catch (error) {
            this.message = `Error dealing initial hands: ${error.message}`;
            this.gameOver = true;
            return;
        }

        // Place the first card on the discard pile
        if (this.deck.cards.length === 0) {
            this.message = "Deck is empty, cannot start game.";
            this.gameOver = true;
            return;
        }
        let startingCard = this.deck.deal(1)[0];

        // If the starting card is an 8, set the suit based on the card itself.
        if (startingCard.rank === '8') {
            this.currentSuit = startingCard.suit;
            this.message = `Starting card is an 8. Current suit is ${this.currentSuit}.`;
        } else {
            this.currentSuit = startingCard.suit;
            this.message = `Game started. Top card is: ${startingCard}.`;
        }
        this.discardPile.push(startingCard);

        // Set the first player's turn
        this.turn = this.playerIds[0];
        this.message += ` It's player ${this.turn}'s turn.`

        console.log("Game started.");
    }

    getTopCard() {
        return this.discardPile.length > 0 ? this.discardPile[this.discardPile.length - 1] : null;
    }

    isValidPlay(cardToPlay) {
        const topCard = this.getTopCard();
        if (!topCard) return true; // Should only happen if discard pile is empty

        return cardToPlay.rank === '8' || cardToPlay.rank === topCard.rank || cardToPlay.suit === this.currentSuit;
    }

    playCard(playerId, cardToPlayData, chosenSuit = null) {
        if (this.turn !== playerId) {
            throw new Error("It's not your turn.");
        }

        const player = this.players[playerId];
        const cardIndex = player.hand.findIndex(card => card.suit === cardToPlayData.suit && card.rank === cardToPlayData.rank);

        if (cardIndex === -1) {
            throw new Error(`Card not found in your hand.`);
        }

        const card = player.hand[cardIndex];

        if (!this.isValidPlay(card)) {
            throw new Error(`Invalid play. You cannot play ${card.toString()} on ${this.getTopCard().toString()}.`);
        }

        // Move card from hand to discard pile
        const [playedCard] = player.hand.splice(cardIndex, 1);
        this.discardPile.push(playedCard);

        // Handle special card logic (e.g., for '8')
        if (playedCard.rank === '8') {
            if (!chosenSuit || !SUITS.includes(chosenSuit)) {
                throw new Error("When playing an 8, you must choose a valid suit.");
            }
            this.currentSuit = chosenSuit;
            this.message = `Player ${playerId} played an 8 and chose ${this.currentSuit}.`;
        } else {
            this.currentSuit = playedCard.suit;
            this.message = `Player ${playerId} played ${playedCard.toString()}.`;
        }

        if (this.checkWin(playerId)) return;

        this.nextTurn();
    }

    drawCard(playerId) {
        if (this.turn !== playerId) {
            throw new Error("It's not your turn to draw.");
        }

        if (this.deck.cards.length === 0) {
            if (this.discardPile.length <= 1) {
                this.message = "No cards left to draw. The game is a draw.";
                this.gameOver = true;
                this.winner = 'draw';
                return;
            }
            // Reshuffle discard pile into deck
            const topCard = this.discardPile.pop();
            this.deck.cards = this.discardPile;
            this.discardPile = [topCard];
            this.deck.shuffle();
            this.message = "Deck reshuffled.";
        }

        const drawnCard = this.deck.deal(1)[0];
        this.players[playerId].hand.push(drawnCard);
        this.message = `Player ${playerId} drew a card.`;
        // The player who draws can end their turn, they don't get to play the card immediately.
        this.nextTurn();
    }

    nextTurn() {
        const currentIndex = this.playerIds.indexOf(this.turn);
        const nextIndex = (currentIndex + 1) % this.playerIds.length;
        this.turn = this.playerIds[nextIndex];
        this.message += ` It's now player ${this.turn}'s turn.`;
    }

    checkWin(playerId) {
        if (this.players[playerId].hand.length === 0) {
            this.gameOver = true;
            this.winner = playerId;
            this.message = `Player ${playerId} wins!`;
            return true;
        }
        return false;
    }

    // Get state from the perspective of a specific player
    getStateForPlayer(playerId) {
        return {
            myHand: this.players[playerId].hand.map(card => card.toJSON()),
            opponents: this.playerIds
                .filter(id => id !== playerId)
                .map(id => ({ id, handSize: this.players[id].hand.length })),
            topCard: this.getTopCard() ? this.getTopCard().toJSON() : null,
            currentSuit: this.currentSuit,
            turn: this.turn,
            gameOver: this.gameOver,
            winner: this.winner,
            message: this.message,
            myId: playerId,
            playerIds: this.playerIds
        };
    }
}

module.exports = GameState;
