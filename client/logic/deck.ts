import { Card, SUITS, RANKS } from './card';

export class Deck {
  cards: Card[];

  constructor() {
    this.cards = [];
    this.initialize();
  }

  initialize() {
    this.cards = [];
    const standardRanks = RANKS.filter(r => r !== 'Joker');
    for (const suit of SUITS) {
      for (const rank of standardRanks) {
        this.cards.push(new Card(suit, rank));
      }
    }
    // Add two jokers
    this.cards.push(new Card('Hearts', 'Joker')); // Red Joker
    this.cards.push(new Card('Spades', 'Joker')); // Black Joker
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(numCards: number): Card[] {
    if (this.cards.length < numCards) {
      throw new Error('Not enough cards in the deck to deal.');
    }
    return this.cards.splice(0, numCards);
  }

  isEmpty(): boolean {
    return this.cards.length === 0;
  }
}
