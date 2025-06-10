export type Suit = 'Hearts' | 'Diamonds' | 'Clubs' | 'Spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'Jack' | 'Queen' | 'King' | 'Ace';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Opponent {
  id: string;
  name: string;
  handSize: number;
}

export interface GameState {
  myHand: Card[];
  opponents: Opponent[];
  topCard: Card | null;
  currentSuit: Suit | null;
  turn: string | null; // player ID
  gameOver: boolean;
  winner: string | null;
  winnerName?: string;
  message: string;
  myId: string;
  players: { [id: string]: { name: string; hand: Card[] } };
  roomId?: string;
}
