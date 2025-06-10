// backend/deck.js
const { Card, SUITS, RANKS } = require('./card');

class Deck {
    constructor() {
        this.cards = [];
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]; // Swap
        }
    }

    deal(numCards) {
        if (numCards > this.cards.length) {
            throw new Error("Not enough cards in the deck to deal.");
        }
        const dealtCards = this.cards.splice(-numCards); // Remove from the end (top)
        return dealtCards;
    }
     peekTopCard() {
        if (this.cards.length === 0) {
            return null;
        }
        return this.cards[this.cards.length - 1];
    }
}

module.exports = Deck;
