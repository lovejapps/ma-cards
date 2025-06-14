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

    // After any successful play, reset the has-drawn flag for the turn.
    this.playerHasDrawn = false;

    if (player.hand.length === 0) {
      this.gameOver = true;
      this.winner = player.id;
      this.message = `${player.name} wins!`;
      return { success: true, message: '' };
    }

    // Handle special card rules for turn progression
    if (cardInHand.rank === 'King') {
      this.message += ` You played a King, go again!`;
    } else if (cardInHand.rank === '7') {
      const playerName = this.players[this.turn].name;
      this.message = `${playerName} played a 7.`;
      this.skipNextPlayer();
    } else if (cardInHand.rank === 'Jack') {
        const playerName = this.players[this.turn].name;
        this.message = `${playerName} played a Jack.`;
        if (this.players.length === 2) {
            // With 2 players, J acts like a K
            this.message += ` Go again!`;
        } else {
            // With >2 players, turn goes to the previous player
            const currentIndex = this.turn;
            const nextIndex = (currentIndex - 1 + this.players.length) % this.players.length;
            this.turn = nextIndex;
            this.playerHasDrawn = false;
            const nextPlayerName = this.players[this.turn].name;
            this.message += ` It's now ${nextPlayerName}'s turn.`;
            if (this.players[this.turn].isComputer) {
                setTimeout(() => this.computerTurn(), 1000);
            }
        }
    } else {
      this.nextTurn();
    }

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
    const nextPlayerName = this.players[this.turn].name;
    this.message += ` It's now ${nextPlayerName}'s turn.`;
    if (this.players[this.turn].isComputer) {
      setTimeout(() => this.computerTurn(), 1000);
    }
  }

  skipNextPlayer() {
    const skippedPlayerIndex = (this.turn + 1) % this.players.length;
    const nextPlayerIndex = (this.turn + 2) % this.players.length;

    const skippedPlayerName = this.players[skippedPlayerIndex].name;
    this.message += ` ${skippedPlayerName} is skipped!`;

    this.turn = nextPlayerIndex;
    this.playerHasDrawn = false;
    const nextPlayerName = this.players[this.turn].name;
    this.message += ` It's now ${nextPlayerName}'s turn.`;

    if (this.players[this.turn].isComputer) {
      setTimeout(() => this.computerTurn(), 1000);
    }
  }

  computerTurn() {
    const player = this.players[this.turn];
    if (!player || !player.isComputer) return;

    // Helper function to find the best suit to choose for an 8
    const chooseSuitFor8 = () => {
      const suitCounts = player.hand.reduce((acc, c) => {
        if (c.rank !== '8') { acc[c.suit] = (acc[c.suit] || 0) + 1; }
        return acc;
      }, {} as Record<Suit, number>);
      return (Object.keys(suitCounts).sort((a, b) => suitCounts[b as Suit] - suitCounts[a as Suit])[0] || 'Spades') as Suit;
    };

    // Main AI logic loop
    const takeTurn = () => {
      const playableCards = player.hand.filter(card => this.isValidPlay(card));

      if (playableCards.length > 0) {
        // Strategy: Prioritize non-special cards, then strategic special cards.
        let cardToPlay = playableCards.find(c => !['8', 'Joker', 'King', '7', 'Jack'].includes(c.rank));

        if (!cardToPlay) {
          // King/Jack (2-player) strategy
          const goAgainCard = playableCards.find(c => c.rank === 'King' || (c.rank === 'Jack' && this.players.length === 2));
          if (goAgainCard && playableCards.length > 1) {
            cardToPlay = goAgainCard;
          } else {
            // 7 strategy
            const sevenCard = playableCards.find(c => c.rank === '7');
            if (sevenCard && player.hand.length > 1) {
                cardToPlay = sevenCard;
            } else {
                // Jack (>2 player) strategy
                const jackCard = playableCards.find(c => c.rank === 'Jack');
                if (jackCard) {
                    cardToPlay = jackCard;
                } else {
                    cardToPlay = playableCards[0]; // Fallback to any special card
                }
            }
          }
        }

        const chosenSuit = cardToPlay.rank === '8' ? chooseSuitFor8() : undefined;
        const result = this.playCard(player.id, cardToPlay, chosenSuit);

        // If a go-again card was played successfully, the AI gets to go again immediately.
        if (result.success && (cardToPlay.rank === 'King' || (cardToPlay.rank === 'Jack' && this.players.length === 2))) {
          setTimeout(() => takeTurn(), 500);
        }
      } else {
        this.drawCard(player.id);
        const drawnCard = player.hand[player.hand.length - 1];
        if (this.isValidPlay(drawnCard)) {
          setTimeout(() => {
            const chosenSuit = drawnCard.rank === '8' ? chooseSuitFor8() : undefined;
            this.playCard(player.id, drawnCard, chosenSuit);
          }, 500);
        } else {
          this.passTurn(player.id);
        }
      }
    };

    takeTurn();
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
