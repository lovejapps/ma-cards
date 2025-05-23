// backend/card.js
const SUITS = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'];

class Card {
    constructor(suit, rank) {
        if (!SUITS.includes(suit)) {
            throw new Error(`Invalid suit: ${suit}`);
        }
        if (!RANKS.includes(rank)) {
            throw new Error(`Invalid rank: ${rank}`);
        }
        this.suit = suit;
        this.rank = rank;
    }

    toString() {
        return `${this.rank} of ${this.suit}`;
    }

    toJSON() {
        return { suit: this.suit, rank: this.rank };
    }

    equals(other) {
        if (!(other instanceof Card)) {
            return false;
        }
        return this.suit === other.suit && this.rank === other.rank;
    }
}

module.exports = { Card, SUITS, RANKS };
