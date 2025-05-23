// backend/gameState.js
const Deck = require('./deck');
const { Card, SUITS } = require('./card');

class GameState {
    constructor(playerName) {
        this.playerName = playerName;
        this.deck = new Deck();
        this.deck.shuffle();
        this.discardPile = [];
        this.currentSuit = null; // Used when an 8 is played
        this.playerHand = [];
        this.appHand = [];
        this.gameOver = false;
        this.winner = null;
        this.message = "";
    }

    startNewGame() {
        // Deal initial hands (e.g., 8 cards each)
        try {
            this.playerHand = this.deck.deal(8);
            this.appHand = this.deck.deal(8);
        } catch (error) {
            this.message = `Error dealing initial hands: ${error.message}`;
            // Potentially handle this error more robustly
            return;
        }


        // Place the first card on the discard pile
        if (this.deck.cards.length === 0) {
             this.message = "Deck is empty, cannot start game.";
             this.gameOver = true; // Or handle appropriately
             return;
        }
        let startingCard = this.deck.deal(1)[0];

        // If the starting card is an 8, put it back and draw again (common Crazy Eights rule)
        // Or, alternatively, handle it by setting the suit. Let's set the suit for simplicity here.
         if (startingCard.rank === '8') {
             // In a real game, the dealer chooses the suit. For simplicity, let's use the 8's suit.
             this.currentSuit = startingCard.suit;
             this.message = `Starting card is an 8. Current suit is ${this.currentSuit}.`;
         } else {
             this.currentSuit = startingCard.suit;
             this.message = `Game started. Top card is: ${startingCard}. Current suit is ${this.currentSuit}.`;
         }
         this.discardPile.push(startingCard);


        console.log("Game started.");
        console.log("Player Hand:", this.playerHand.map(card => card.toString()));
        console.log("App Hand:", this.appHand.map(card => card.toString())); // Keep app's hand hidden in a real UI
        console.log("Top card:", this.getTopCard().toString());
        console.log("Current suit:", this.currentSuit);

    }

    getTopCard() {
        if (this.discardPile.length === 0) {
            return null;
        }
        return this.discardPile[this.discardPile.length - 1];
    }

    isValidPlay(cardToPlay) {
        const topCard = this.getTopCard();
        if (!topCard) {
            // Should not happen after the first card is placed
            return true;
        }

        // An 8 can always be played
        if (cardToPlay.rank === '8') {
            return true;
        }

        // Check if the card matches the rank of the top card
        if (cardToPlay.rank === topCard.rank) {
            return true;
        }

        // Check if the card matches the current suit (which might have been set by an 8)
        if (this.currentSuit && cardToPlay.suit === this.currentSuit) {
            return true;
        }

         // Fallback: Check if the card matches the top card's suit if currentSuit is not set (shouldn't happen if currentSuit is always updated)
         if (this.currentSuit === null && cardToPlay.suit === topCard.suit) {
             return true;
         }


        return false;
    }

    playCard(playerType, cardToPlay, chosenSuit = null) {
        // playerType should be 'player' or 'app'
        const hand = playerType === 'player' ? this.playerHand : this.appHand;
        const cardIndex = hand.findIndex(card => card.equals(cardToPlay));

        if (cardIndex === -1) {
            throw new Error(`Card not found in ${playerType}'s hand.`);
        }

        const card = hand[cardIndex]; // Get the actual card object from hand for strict comparison if needed later

        if (!this.isValidPlay(card)) {
            throw new Error(`Invalid play: ${card.toString()} cannot be played on ${this.getTopCard().toString()}. Current suit is ${this.currentSuit}`);
        }

        // Remove card from hand
        const [playedCard] = hand.splice(cardIndex, 1);
        this.discardPile.push(playedCard);

        // Handle 8s
        if (playedCard.rank === '8') {
            if (playerType === 'player' && (chosenSuit === null || !SUITS.includes(chosenSuit))) {
                 throw new Error("When playing an 8, a chosen_suit must be provided by the player.");
            }
             // If app plays an 8, it chooses the suit it has the most of, or a random one
            if (playerType === 'app') {
                 chosenSuit = this.determineAppChosenSuit();
                 this.currentSuit = chosenSuit;
                 this.message = `App played 8 and chose ${this.currentSuit}.`;
            } else {
                 this.currentSuit = chosenSuit;
                 this.message = `${this.playerName} played 8 and chose ${this.currentSuit}.`;
            }

        } else {
             // If a non-8 is played, the current suit reverts to the suit of the played card
             this.currentSuit = playedCard.suit;
             this.message = `${playerType === 'player' ? this.playerName : 'App'} played ${playedCard.toString()}. Current suit is now: ${this.currentSuit}.`;
        }

        // Check for win
        this.checkWin();
    }

    drawCard(playerType) {
        if (this.deck.cards.length === 0) {
            // Reshuffle discard pile to form new deck (except for the top card)
            if (this.discardPile.length <= 1) {
                 // No cards to reshuffle or only the top card remains
                 this.message = "No cards left to draw.";
                 this.gameOver = true;
                 this.winner = "No one (draw)"; // Or handle differently
                 return null;
            }
            const topCard = this.discardPile.pop(); // Save the top card
            this.deck.cards = this.discardPile; // Discard pile becomes the new deck
            this.discardPile = [topCard]; // Top card remains on the discard pile
            this.deck.shuffle();
             this.message = "Deck is empty. Reshuffling discard pile.";
            console.log("Deck is empty. Reshuffling discard pile.");
        }

        try {
            const drawnCard = this.deck.deal(1)[0];
            if (playerType === 'player') {
                this.playerHand.push(drawnCard);
                 this.message = `${this.playerName} drew a card.`;
            } else {
                this.appHand.push(drawnCard);
                 this.message = `App drew a card.`;
            }
             console.log(`${playerType === 'player' ? this.playerName : 'App'} drew: ${drawnCard.toString()}`);
            return drawnCard;
        } catch (error) {
            this.message = `Error drawing card: ${error.message}`;
            return null;
        }
    }

    // Simple AI for the app to play a card
    appPlayTurn() {
        console.log("App's turn.");
         this.message = "App's turn.";
        // Find a playable card
        let playableCard = null;
        for (const card of this.appHand) {
            if (this.isValidPlay(card)) {
                playableCard = card;
                break; // Play the first valid card found
            }
        }

        if (playableCard) {
             try {
                let chosenSuit = null;
                if (playableCard.rank === '8') {
                     chosenSuit = this.determineAppChosenSuit();
                }
                this.playCard('app', playableCard, chosenSuit);
                console.log(`App played: ${playableCard.toString()}`);
                if (playableCard.rank === '8') {
                     console.log(`App chose suit: ${this.currentSuit}`);
                }
             } catch (error) {
                 console.error("App failed to play a valid card:", error.message);
                 // This shouldn't happen if isValidPlay is correct, but good practice
                  this.message = `App tried to play but failed: ${error.message}`;
                 // App would normally draw in this case
             }

        } else {
            // App cannot play, must draw
             console.log("App cannot play. Drawing a card.");
            this.drawCard('app');
        }

        // Check for win after app plays/draws
         this.checkWin();

         // After app plays, it's the player's turn unless the game is over
         if (!this.gameOver) {
             this.message += ` It's ${this.playerName}'s turn.`;
         }
    }

    // Simple logic for app to choose a suit after playing an 8
    determineAppChosenSuit() {
        const suitCounts = {};
        SUITS.forEach(suit => suitCounts[suit] = 0);

        for (const card of this.appHand) {
            if (suitCounts[card.suit] !== undefined) {
                suitCounts[card.suit]++;
            }
        }

        let bestSuit = null;
        let maxCount = -1;

        for (const suit of SUITS) {
            if (suitCounts[suit] > maxCount) {
                maxCount = suitCounts[suit];
                bestSuit = suit;
            }
        }

        // If no cards in hand, choose a random suit (shouldn't happen if 8 was played)
         if (bestSuit === null) {
             return SUITS[Math.floor(Math.random() * SUITS.length)];
         }

        return bestSuit;
    }


    checkWin() {
        if (this.playerHand.length === 0) {
            this.gameOver = true;
            this.winner = this.playerName;
             this.message = `${this.playerName} wins!`;
            console.log(`${this.playerName} wins!`);
        } else if (this.appHand.length === 0) {
            this.gameOver = true;
            this.winner = 'App';
             this.message = `App wins!`;
            console.log(`App wins!`);
        }
         // Need to add logic for drawing the whole deck and no valid plays
    }

     // Method to get the current state to send to the frontend
    getCurrentState() {
        return {
            playerName: this.playerName,
            playerHand: this.playerHand.map(card => card.toJSON()), // Send card data
            topCard: this.getTopCard() ? this.getTopCard().toJSON() : null,
            currentSuit: this.currentSuit,
            appHandSize: this.appHand.length, // Don't send app's cards
            gameOver: this.gameOver,
            winner: this.winner,
            message: this.message,
             deckSize: this.deck.cards.length,
             discardPileSize: this.discardPile.length,
        };
    }
}

module.exports = GameState;
