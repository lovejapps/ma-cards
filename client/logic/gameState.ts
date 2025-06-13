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
  playerHasDrawn: boolean = false;

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
    this.playerHasDrawn = false;
  }

  getTopCard(): Card | null {
    return this.discardPile.length > 0 ? this.discardPile[this.discardPile.length - 1] : null;
  }

  isValidPlay(card: Card): boolean {
    const topCard = this.getTopCard();
    if (!topCard) {
      return true;
    }
    // Jokers can be played on any card, and any card can be played on a Joker
    if (card.rank === 'Joker' || topCard.rank === 'Joker') {
      return true;
    }
    // Standard rules
    return card.rank === '8' || card.rank === topCard.rank || card.suit === (this.currentSuit || topCard.suit);
  }

  playCard(playerId: string, card: Card, chosenSuit?: Suit): { success: boolean, message: string } {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex !== this.turn) return { success: false, message: "It's not your turn." };

    const player = this.players[playerIndex];
    const cardInHand = player.hand.find(c => c.rank === card.rank && c.suit === card.suit);
    if (!cardInHand) return { success: false, message: 'Card not in hand.' };

    if (!this.isValidPlay(cardInHand)) {
      return { success: false, message: 'Invalid card.' };
    }

    player.hand = player.hand.filter(c => !(c.rank === card.rank && c.suit === card.suit));
    this.discardPile.push(cardInHand);
    
    const playerName = player.name;

    if (cardInHand.rank === 'Joker') {
      this.currentSuit = cardInHand.suit;
      this.message = `${playerName} played a Joker.`;
    } else if (cardInHand.rank === '8') {
      if (!chosenSuit) {
        return { success: false, message: 'You must choose a suit when playing an 8.' };
      }
      this.currentSuit = chosenSuit;
      this.message = `${playerName} played an 8 and chose ${this.currentSuit}.`;
    } else {
      this.currentSuit = cardInHand.suit;
      this.message = `${playerName} played ${cardInHand.toString()}.`;
    }

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

    if (this.playerHasDrawn) {
      return { success: false, message: 'You have already drawn a card.' };
    }

    if (this.deck.isEmpty()) {
        this.deck.cards = this.discardPile.slice(0, -1);
        this.deck.shuffle();
        this.discardPile = this.discardPile.slice(-1);
    }

    if (this.deck.isEmpty()) {
        return { success: false, message: 'No cards to draw.' };
    }

    this.players[playerIndex].hand.push(...this.deck.deal(1));
    this.playerHasDrawn = true;
    this.message = `${this.players[playerIndex].name} drew a card. You can now play a card or pass.`;
    return { success: true, message: '' };
  }

  passTurn(playerId: string): { success: boolean, message: string } {
    const playerIndex = this.players.findIndex(p => p.id === playerId);
    if (playerIndex !== this.turn) {
      return { success: false, message: "It's not your turn." };
    }
    if (!this.playerHasDrawn) {
      return { success: false, message: 'You must draw a card before passing.' };
    }
    this.nextTurn();
    return { success: true, message: '' };
  }

  nextTurn() {
    this.turn = (this.turn + 1) % this.players.length;
    this.playerHasDrawn = false;
    this.message = `${this.players[this.turn].name}'s turn`;
  }

  computerTurn() {
    const player = this.players[this.turn];
    if (!player || !player.isComputer) return;

    const playableCards = player.hand.filter(card => this.isValidPlay(card));

    if (playableCards.length > 0) {
      // Basic strategy: play a non-special card if possible, otherwise play a special card.
      let cardToPlay = playableCards.find(c => c.rank !== '8' && c.rank !== 'Joker');
      if (!cardToPlay) {
        cardToPlay = playableCards[0]; // Play the first available special card
      }

      let chosenSuit: Suit | undefined = undefined;
      if (cardToPlay.rank === '8') {
        // Find the most common suit in hand to choose
        const suitCounts = player.hand.reduce((acc, c) => {
          if (c.rank !== '8') { // Don't count the 8 itself
            acc[c.suit] = (acc[c.suit] || 0) + 1;
          }
          return acc;
        }, {} as Record<Suit, number>);
        chosenSuit = (Object.keys(suitCounts).sort((a, b) => suitCounts[b as Suit] - suitCounts[a as Suit])[0] || 'Spades') as Suit;
      }
      this.playCard(player.id, cardToPlay, chosenSuit);
    } else {
      // Draw a card
      this.drawCard(player.id);
      // Now check if the newly drawn card is playable
      const lastDrawnCard = player.hand[player.hand.length - 1];
      if (this.isValidPlay(lastDrawnCard)) {
        // If it's playable, play it
        this.playCard(player.id, lastDrawnCard, lastDrawnCard.rank === '8' ? 'Spades' : undefined);
      } else {
        // If not, pass the turn
        this.passTurn(player.id);
      }
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
      playerHasDrawn: this.playerHasDrawn && this.players[this.turn].id === playerId,
    };
  }
}
