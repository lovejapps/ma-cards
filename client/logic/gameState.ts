import { Card, Suit } from './card';
import { Deck } from './deck';

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isComputer?: boolean;
}

export class GameState {
  players: Player[] = [];
  deck: Deck;
  discardPile: Card[] = [];
  turn: number = 0;
  gameOver: boolean = false;
  winner: string | null = null;
  message: string = '';
  currentSuit: Suit | null = null;

  constructor(playerNames: string[]) {
    this.deck = new Deck();
    this.players.push({ id: 'player1', name: playerNames[0], hand: [] });
    this.players.push({ id: 'computer', name: 'Computer', hand: [], isComputer: true });
    this.startGame();
  }

  startGame() {
    this.deck.initialize();
    this.deck.shuffle();
    this.players.forEach(p => {
      p.hand = this.deck.deal(7);
    });
    this.discardPile.push(this.deck.deal(1)[0]);
    this.turn = 0;
    this.gameOver = false;
    this.winner = null;
    this.message = `${this.players[0].name}'s turn`;
  }

  getTopCard(): Card | null {
    return this.discardPile.length > 0 ? this.discardPile[this.discardPile.length - 1] : null;
  }

  playCard(playerId: string, card: Card, chosenSuit?: Suit): { success: boolean, message: string } {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex !== this.turn) return { success: false, message: "It's not your turn." };

    const player = this.players[playerIndex];
    const cardInHand = player.hand.find(c => c.rank === card.rank && c.suit === card.suit);
    if (!cardInHand) return { success: false, message: 'Card not in hand.' };

    const topCard = this.getTopCard();
    if (topCard && card.rank !== '8' && card.rank !== topCard.rank && card.suit !== (this.currentSuit || topCard.suit)) {
      return { success: false, message: 'Invalid card.' };
    }

    player.hand = player.hand.filter(c => !(c.rank === card.rank && c.suit === card.suit));
    this.discardPile.push(cardInHand);
    this.currentSuit = card.rank === '8' ? chosenSuit || null : null;

    if (player.hand.length === 0) {
      this.gameOver = true;
      this.winner = player.id;
      this.message = `${player.name} wins!`;
      return { success: true, message: '' };
    }

    this.nextTurn();
    return { success: true, message: '' };
  }

  drawCard(playerId: string): { success: boolean, message: string } {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex !== this.turn) return { success: false, message: "It's not your turn." };

    if (this.deck.isEmpty()) {
        this.deck.cards = this.discardPile.slice(0, -1);
        this.deck.shuffle();
        this.discardPile = this.discardPile.slice(-1);
    }

    if (this.deck.isEmpty()) {
        return { success: false, message: 'No cards to draw.' };
    }

    this.players[playerIndex].hand.push(...this.deck.deal(1));
    this.nextTurn();
    return { success: true, message: '' };
  }

  nextTurn() {
    this.turn = (this.turn + 1) % this.players.length;
    this.message = `${this.players[this.turn].name}'s turn`;
  }

  computerTurn() {
    const player = this.players[this.turn];
    const topCard = this.getTopCard();
    if (!topCard) return;

    const playableCards = player.hand.filter(card => 
        card.rank === '8' || card.rank === topCard.rank || card.suit === (this.currentSuit || topCard.suit)
    );

    if (playableCards.length > 0) {
      const cardToPlay = playableCards[0];
      let chosenSuit: Suit | undefined = undefined;
      if (cardToPlay.rank === '8') {
        const suitCounts = player.hand.reduce((acc, c) => { 
            if(c.rank !== '8') acc[c.suit] = (acc[c.suit] || 0) + 1; 
            return acc; 
        }, {} as Record<Suit, number>);
        chosenSuit = (Object.keys(suitCounts).sort((a,b) => suitCounts[b as Suit] - suitCounts[a as Suit])[0] || 'Spades') as Suit;
      }
      this.playCard(player.id, cardToPlay, chosenSuit);
    } else {
      this.drawCard(player.id);
    }
  }

  getStateForPlayer(playerId: string) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return null;

    return {
      myHand: player.hand.map(c => c.toJSON()),
      opponents: this.players.filter(p => p.id !== playerId).map(p => ({ id: p.id, name: p.name, handSize: p.hand.length })),
      topCard: this.getTopCard()?.toJSON(),
      currentSuit: this.currentSuit,
      turn: this.players[this.turn].id,
      gameOver: this.gameOver,
      winner: this.winner ? this.players.find(p => p.id === this.winner)?.name : null,
      message: this.message,
      myId: playerId,
    };
  }
}
