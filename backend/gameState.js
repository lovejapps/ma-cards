// backend/gameState.js
const Deck = require('./deck');
const { Card, SUITS } = require('./card');

class GameState {
    constructor(initialPlayers) { // initialPlayers is an array of {id, name}
        this.players = {}; // { id: { name, hand } }
        initialPlayers.forEach(p => {
            this.players[p.id] = { name: p.name, hand: [] };
        });
        this.playerIds = Object.keys(this.players);

        this.deck = new Deck();
        this.deck.shuffle();
        this.discardPile = [];
        this.currentSuit = null;
        this.gameOver = false;
        this.winner = null;
        this.message = "";
        this.turn = null;
    }

    addPlayer(player) { // player is {id, name}
        if (Object.keys(this.players).length < 2) {
            this.players[player.id] = { name: player.name, hand: [] };
            this.playerIds.push(player.id);
        }
    }

    removePlayer(playerId) {
        const playerIndex = this.playerIds.indexOf(playerId);
        if (playerIndex > -1) {
            this.playerIds.splice(playerIndex, 1);
        }
        delete this.players[playerId];
    }

    endGame() {
        this.gameOver = true;
        this.message = "Game has ended due to a player disconnecting.";
    }

    startNewGame() {
        if (this.playerIds.length < 2) {
            this.message = "Not enough players to start the game.";
            return;
        }

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
        const firstPlayerName = this.players[this.turn].name;
        this.message += ` It's ${firstPlayerName}'s turn.`

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
            return { success: false, message: "It's not your turn." };
        }

        const player = this.players[playerId];
        const cardIndex = player.hand.findIndex(card => card.suit === cardToPlayData.suit && card.rank === cardToPlayData.rank);

        if (cardIndex === -1) {
            return { success: false, message: 'Card not found in your hand.' };
        }

        const card = player.hand[cardIndex];

        if (!this.isValidPlay(card)) {
            return { success: false, message: `Invalid play. You cannot play ${card.toString()} on ${this.getTopCard().toString()}.` };
        }

        // Move card from hand to discard pile
        const [playedCard] = player.hand.splice(cardIndex, 1);
        this.discardPile.push(playedCard);

        const playerName = this.players[playerId].name;
        // Handle special card logic (e.g., for '8')
        if (playedCard.rank === '8') {
            if (!chosenSuit || !SUITS.includes(chosenSuit)) {
                // This case should ideally be prevented by the client, but as a fallback:
                player.hand.splice(cardIndex, 0, playedCard); // return card to hand
                this.discardPile.pop();
                return { success: false, message: "When playing an 8, you must choose a valid suit." };
            }
            this.currentSuit = chosenSuit;
            this.message = `${playerName} played an 8 and chose ${this.currentSuit}.`;
        } else {
            this.currentSuit = playedCard.suit;
            this.message = `${playerName} played ${playedCard.toString()}.`;
        }

        if (this.checkWin(playerId)) {
            return { success: true };
        }

        this.nextTurn();
        return { success: true };
    }

    drawCard(playerId) {
        if (this.turn !== playerId) {
            return { success: false, message: "It's not your turn to draw." };
        }

        if (this.deck.cards.length === 0) {
            if (this.discardPile.length <= 1) {
                this.message = "No cards left to draw. The game is a draw.";
                this.gameOver = true;
                this.winner = 'draw';
                return { success: true };
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
        this.message = `${this.players[playerId].name} drew a card.`;
        // The player who draws can end their turn, they don't get to play the card immediately.
        this.nextTurn();
        return { success: true };
    }

    nextTurn() {
        const currentIndex = this.playerIds.indexOf(this.turn);
        const nextIndex = (currentIndex + 1) % this.playerIds.length;
        this.turn = this.playerIds[nextIndex];
        const nextPlayerName = this.players[this.turn].name;
        this.message += ` It's now ${nextPlayerName}'s turn.`;
    }

    checkWin(playerId) {
        if (this.players[playerId].hand.length === 0) {
            this.gameOver = true;
            this.winner = playerId;
            const winnerName = this.players[playerId].name;
            this.message = `${winnerName} wins!`;
            return true;
        }
        return false;
    }

    // Get state from the perspective of a specific player
    getStateForPlayer(playerId) {
        const winnerName = this.winner ? this.players[this.winner]?.name : null;
        return {
            myHand: this.players[playerId].hand.map(card => card.toJSON()),
            opponents: this.playerIds
                .filter(id => id !== playerId)
                .map(id => ({ 
                    id, 
                    name: this.players[id].name, 
                    handSize: this.players[id].hand.length 
                })),
            topCard: this.getTopCard() ? this.getTopCard().toJSON() : null,
            currentSuit: this.currentSuit,
            turn: this.turn,
            gameOver: this.gameOver,
            winner: this.winner,
            winnerName: winnerName,
            message: this.message,
            myId: playerId,
            players: this.players
        };
    }
}

module.exports = GameState;
