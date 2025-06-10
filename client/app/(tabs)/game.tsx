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
  View,
  Clipboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { io, Socket } from 'socket.io-client';

// Platform-specific alert function
const showAlert = (title: string, message: string, buttons: { text: string; onPress?: () => void }[] = []) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    const okButton = buttons.find((btn) => btn.text === 'OK' || btn.text === 'Ok' || btn.text === 'ok');
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
  name: string;
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
  winnerName?: string;
  message: string;
  myId: string;
  players: { [id: string]: { name: string; hand: Card[] } };
  roomId?: string;
}

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { action, playerName, roomId: initialRoomId } = params;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(initialRoomId as string || null);
  const [status, setStatus] = useState<string>('connecting'); // connecting, waiting, playing
  const [showSuitModal, setShowSuitModal] = useState<boolean>(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);

  useEffect(() => {
    const newSocket = io(WEBSOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server!');
      if (action === 'create') {
        newSocket.emit('createGame', { playerName });
        setStatus('waiting');
      } else if (action === 'join' && initialRoomId) {
        newSocket.emit('joinGame', { roomId: initialRoomId, playerName });
      }
    });

    newSocket.on('gameCreated', ({ roomId: newRoomId }) => {
      setRoomId(newRoomId);
      console.log(`Game created with ID: ${newRoomId}`);
    });

    newSocket.on('gameStart', ({ players }) => {
      setStatus('playing');
      console.log(`Game started with players:`, players);
    });

    newSocket.on('gameState', (gameState: GameState) => {
      setGame(gameState);
      if (gameState.gameOver) {
        showAlert('Game Over', gameState.winnerName ? `${gameState.winnerName} won!` : 'Game Over!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    });

    newSocket.on('invalidMove', ({ message }) => {
      showAlert('Invalid Move', message);
    });

    newSocket.on('gameError', ({ message }) => {
      showAlert('Error', message, [{ text: 'OK', onPress: () => router.back() }]);
    });

    newSocket.on('opponentDisconnected', (message: string) => {
      showAlert('Opponent Disconnected', message, [{ text: 'OK', onPress: () => router.back() }]);
      setGame(null);
      setRoomId(null);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [action, playerName, initialRoomId, router]);

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

  const handleCopyRoomId = () => {
    if (roomId) {
      if (Platform.OS === 'web') {
        navigator.clipboard.writeText(roomId)
          .then(() => showAlert('Copied!', 'Room ID copied to clipboard.'))
          .catch(() => showAlert('Error', 'Failed to copy Room ID.'));
      } else {
        Clipboard.setString(roomId);
        showAlert('Copied!', 'Room ID copied to clipboard.');
      }
    }
  };

  if (status === 'connecting') {
      return <View style={[styles.container, styles.contentContainer]}><ActivityIndicator size="large" /><Text>Connecting to server...</Text></View>;
  }

  if (status === 'waiting') {
    return (
      <View style={[styles.container, styles.contentContainer]}>
        <Text style={styles.title}>Waiting for Opponent...</Text>
        {roomId ? (
          <>
            <Text style={styles.infoText}>Share this Room ID with your friend:</Text>
            <View style={styles.roomIdContainer}>
              <Text style={styles.roomIdText}>{roomId}</Text>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopyRoomId}>
                <Text style={styles.buttonText}>Copy ID</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <ActivityIndicator size="large" />
        )}
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
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
                                <View style={styles.header}>
                    <Text style={styles.headerText}>Room: {roomId}</Text>
                    <TouchableOpacity style={styles.copyButtonSmall} onPress={handleCopyRoomId}>
                        <Text style={styles.copyButtonText}>Copy ID</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {if(socket) socket.disconnect(); router.back()}}>
                        <Text style={styles.leaveButtonText}>Leave Game</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.opponentInfo}>
                    {game.opponents.map(op => <Text key={op.id}>{op.name}: {op.handSize} cards</Text>)}
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
                    {game.gameOver ? `Game Over! ${game.winnerName ? `${game.winnerName} wins!` : 'You lose.'}` : (game.turn === game.myId ? "It's your turn!" : `Waiting for ${game.players[game.turn!]?.name}...`)}
                </Text>
            </View>
        ) : (
            <ActivityIndicator size="large" />
        )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  infoText: {
    fontSize: 16,
    marginBottom: 10,
  },
  roomIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  roomIdText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  copyButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  copyButtonSmall: {
    backgroundColor: '#007AFF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginHorizontal: 10,
  },
  copyButtonText: {
    color: 'white',
    fontSize: 14,
  },
  leaveButtonText: {
    color: 'red',
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: '#dc3545',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    width: '80%',
    marginTop: 20,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    backgroundColor: '#f8f8f8',
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
