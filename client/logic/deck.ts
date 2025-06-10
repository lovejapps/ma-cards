import { Card, SUITS, RANKS } from './card';

export class Deck {
  cards: Card[];

  constructor() {
    this.cards = [];
    this.initialize();
  }

  initialize() {
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
