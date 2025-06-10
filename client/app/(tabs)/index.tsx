import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { io, Socket } from 'socket.io-client';

// Platform-specific alert function
const showAlert = (title: string, message: string, buttons: {text: string, onPress?: () => void}[] = []) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    const okButton = buttons.find(btn => btn.text === 'OK' || btn.text === 'Ok' || btn.text === 'ok');
    if (okButton && okButton.onPress) {
      okButton.onPress();
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

const WEBSOCKET_URL = 'http://localhost:3000';

type Suit = 'Hearts' | 'Diamonds' | 'Clubs' | 'Spades';
const SUITS: Suit[] = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'Jack' | 'Queen' | 'King' | 'Ace';

interface Card {
    suit: Suit;
    rank: Rank;
}

interface Opponent {
    id: string;
    handSize: number;
}

interface GameState {
    myHand: Card[];
    opponents: Opponent[];
    topCard: Card | null;
    currentSuit: Suit | null;
    turn: string | null; // player ID
    gameOver: boolean;
    winner: string | null;
    message: string;
    myId: string;
    playerIds: string[];
    roomId?: string;
}

export default function HomeScreen() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('connecting'); // connecting, waiting, playing
  const [showSuitModal, setShowSuitModal] = useState<boolean>(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  useEffect(() => {
    const newSocket = io(WEBSOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server!');
      setStatus('connected');
    });

    newSocket.on('waitingForPlayer', (message: string) => {
        setStatus('waiting');
        console.log(message);
    });

    newSocket.on('gameStart', ({ roomId, players }: { roomId: string, players: string[] }) => {
        setRoomId(roomId);
        setStatus('playing');
        console.log(`Game started in room ${roomId} with players:`, players);
    });

    newSocket.on('gameState', (gameState: GameState) => {
        setGame(gameState);
        if (gameState.gameOver) {
            const winner = gameState.winner === gameState.myId ? 'You' : `Player ${gameState.winner}`;
            showAlert('Game Over', `${winner} won!`);
        }
    });

    newSocket.on('gameError', ({ message }: { message: string }) => {
        showAlert('Error', message);
    });

    newSocket.on('opponentDisconnected', (message: string) => {
        showAlert('Opponent Disconnected', message);
        setGame(null);
        setRoomId(null);
        setStatus('connected'); // Go back to a state where they can find a new game
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handlePlayCard = (cardToPlay: Card) => {
      if (!game || game.gameOver || game.turn !== game.myId) return;

      if (cardToPlay.rank === '8') {
          setSelectedCard(cardToPlay);
          setShowSuitModal(true);
      } else {
          sendPlayCard(cardToPlay);
      }
  };

  const handleSuitSelect = (suit: Suit) => {
      if (selectedCard && socket && roomId) {
          sendPlayCard(selectedCard, suit);
      }
      setShowSuitModal(false);
      setSelectedCard(null);
  };

  const sendPlayCard = (cardToPlay: Card, chosenSuit?: Suit) => {
      if (socket && roomId) {
          socket.emit('playCard', { roomId, card: cardToPlay, chosenSuit });
      }
  };

  const handleDrawCard = () => {
      if (socket && roomId && game && game.turn === game.myId) {
          socket.emit('drawCard', { roomId });
      }
  };

  const getSuitSymbol = (suit: Suit): string => {
      switch (suit) {
          case 'Hearts': return '♥';
          case 'Diamonds': return '♦';
          case 'Clubs': return '♣';
          case 'Spades': return '♠';
          default: return '';
      }
  };

  const renderCard = (card: Card, index: number, onPress: ((card: Card) => void) | null = null) => {
      const suitColor: string = (card.suit === 'Hearts' || card.suit === 'Diamonds') ? 'red' : 'black';
      const isPlayable = game && game.turn === game.myId && !game.gameOver;

      return (
          <TouchableOpacity key={index} style={styles.card} onPress={() => isPlayable && onPress ? onPress(card) : null} disabled={!isPlayable}>
              <Text style={styles.cardRank}>{card.rank}</Text>
              <Text style={[styles.cardSuit, { color: suitColor }]}>{getSuitSymbol(card.suit)}</Text>
          </TouchableOpacity>
      );
  };

  if (status === 'connecting') {
      return <View style={[styles.container, styles.contentContainer]}><ActivityIndicator size="large" /><Text>Connecting to server...</Text></View>;
  }

  if (status === 'waiting') {
      return <View style={[styles.container, styles.contentContainer]}><ActivityIndicator size="large" /><Text>Waiting for another player...</Text></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Modal
            transparent={true}
            visible={showSuitModal}
            onRequestClose={() => setShowSuitModal(false)} >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Choose a Suit</Text>
                    {SUITS.map((suit) => (
                        <TouchableOpacity key={suit} style={styles.button} onPress={() => handleSuitSelect(suit)}>
                            <Text style={styles.buttonText}>{suit}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </Modal>
        {game ? (
            <View>
                <View style={styles.opponentInfo}>
                    {game.opponents.map(op => <Text key={op.id}>Opponent ({op.id.substring(0, 5)}): {op.handSize} cards</Text>)}
                </View>

                <View style={styles.playArea}>
                    <Text>Top Card:</Text>
                    {game.topCard ? renderCard(game.topCard, -1) : <Text>No card</Text>}
                    <Text>Current Suit: {game.currentSuit ? getSuitSymbol(game.currentSuit) : 'None'}</Text>
                </View>

                <View style={styles.playerHandContainer}>
                    <Text>Your Hand ({game.myHand.length} cards):</Text>
                    <ScrollView horizontal>
                        {game.myHand.map((card, index) => renderCard(card, index, handlePlayCard))}
                    </ScrollView>
                </View>

                <View style={styles.actionsContainer}>
                    <TouchableOpacity style={styles.button} onPress={handleDrawCard} disabled={game.turn !== game.myId || game.gameOver}>
                        <Text style={styles.buttonText}>Draw Card</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.messageText}>{game.message}</Text>
                <Text style={styles.turnIndicator}>
                    {game.gameOver ? `Game Over! ${game.winner === game.myId ? 'You win!' : 'You lose.'}` : (game.turn === game.myId ? "It's your turn!" : "Waiting for opponent...")}
                </Text>
            </View>
        ) : (
            <ActivityIndicator size="large" />
        )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
  },
  contentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    margin: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  opponentInfo: {
    margin: 10,
    alignItems: 'center',
  },
  playArea: {
    alignItems: 'center',
    margin: 10,
  },
  playerHandContainer: {
    margin: 10,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    margin: 10,
  },
  messageText: {
    margin: 10,
    textAlign: 'center',
  },
  turnIndicator: {
    margin: 10,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
  },
  card: {
    width: 80,
    height: 120,
    backgroundColor: 'white',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardRank: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  cardSuit: {
    fontSize: 20,
  },
});

