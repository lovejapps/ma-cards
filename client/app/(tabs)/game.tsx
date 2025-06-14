import React, { useEffect, useState, useCallback } from 'react';
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
import { Card as CardComponent } from '@/components/Card';
import { GameState as ServerGameState, Card as CardType, Suit } from '@/types';
import { GameState as LocalGameState } from '@/logic/gameState';
import { Card } from '../../logic/card';

const WEBSOCKET_URL = process.env.EXPO_PUBLIC_WEBSOCKET_URL || 'http://localhost:3000';

// Unified game state type for rendering
interface GameView {
  myHand: CardType[];
  opponents: { id: string; name: string; handSize: number }[];
  topCard: CardType | null;
  currentSuit: Suit | null;
  turn: string; // Can be player ID or 'computer'
  gameOver: boolean;
  winner: string | null;
  message: string;
  myId: string;
  playerHasDrawn: boolean;
}

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { gameMode, playerName, roomId, action } = params;

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${WEBSOCKET_URL}/api/health`);
        const data = await response.json();
        console.log('Server health:', data);
      } catch (error) {
        console.error('Error checking server health:', error);
      }
    };

    checkHealth();
  }, []);

  const [socket, setSocket] = useState<Socket | null>(null);
  const [localGame, setLocalGame] = useState<LocalGameState | null>(null);
  const [game, setGame] = useState<GameView | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<{ [id: string]: string }>({});
  const [myId, setMyId] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [status, setStatus] = useState(gameMode === 'singleplayer' ? 'playing' : 'connecting');
  const [suitChoice, setSuitChoice] = useState<{ show: boolean, card: CardType | null }>({ show: false, card: null });

  const showAlert = (title: string, message: string, buttons?: any[]) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
      if (buttons && buttons[0].onPress) buttons[0].onPress();
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  const updateGameStateView = useCallback((state: LocalGameState | ServerGameState, localPlayerId?: string) => {
    if (state instanceof LocalGameState) {
      const localState = state.getStateForPlayer(localPlayerId || 'player1');
      if(localState) setGame(localState as GameView);
    } else {
      // This is a hack to make the server state conform to the GameView
      const serverState = state as any;
      serverState.winner = serverState.winnerName;
      setGame(serverState as GameView);
    }
  }, []);

  // Effect for single player mode
  useEffect(() => {
    if (gameMode === 'singleplayer') {
      const newLocalGame = new LocalGameState([playerName as string]);
      setLocalGame(newLocalGame);
      updateGameStateView(newLocalGame, 'player1');
    }
  }, [gameMode, playerName, updateGameStateView]);

  // Effect for WebSocket connection and event listeners
  useEffect(() => {
    if (gameMode !== 'multiplayer') return;

    const newSocket = io(WEBSOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setStatus('waiting');
      setMyId(newSocket.id || null);
    });

    newSocket.on('roomCreated', ({ roomId, playerId, playerName }) => {
      router.setParams({ roomId });
      setHostId(playerId);
      setLobbyPlayers({ [playerId]: playerName });
    });

    newSocket.on('playerJoined', ({ players, hostId }) => {
      setLobbyPlayers(players);
      setHostId(hostId);
    });

    newSocket.on('gameStart', () => setStatus('playing'));
    newSocket.on('gameState', (gs: ServerGameState) => updateGameStateView(gs));
    newSocket.on('invalidMove', ({ message }) => showAlert('Invalid Move', message));
    newSocket.on('gameError', ({ message }) => showAlert('Error', message, [{ text: 'OK', onPress: () => router.back() }]));
    newSocket.on('opponentDisconnected', (message) => showAlert('Opponent Left', message, [{ text: 'OK', onPress: () => router.back() }]));
    newSocket.on('disconnect', () => setStatus('connecting'));

    // Cleanup function
    return () => {
      newSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode]);

  // Effect to create or join a room once connected
  useEffect(() => {
    if (gameMode === 'multiplayer' && socket && myId) {
      const pRoomId = Array.isArray(roomId) ? roomId[0] : roomId;
      if (action === 'create' && !pRoomId) {
        socket.emit('createRoom', { playerName });
      } else if (action === 'join' && pRoomId) {
        socket.emit('joinRoom', { playerName, roomId: pRoomId });
      }
    }
  }, [gameMode, socket, myId, action, roomId, playerName]);

  useEffect(() => {
    if (game?.gameOver) {
      showAlert('Game Over', `${game.winner} has won the game!`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [game?.gameOver, game?.winner, router]);

  useEffect(() => {
    if (gameMode === 'singleplayer' && game?.turn === 'computer' && localGame && !game.gameOver) {
      setTimeout(() => {
        localGame.computerTurn();
        updateGameStateView(localGame, 'player1');
      }, 1000);
    }
  }, [game?.turn, localGame, gameMode, updateGameStateView, game?.gameOver]);

  const handlePlayCard = (card: CardType) => {
    if (card.rank === '8') {
      setSuitChoice({ show: true, card });
    } else {
      if (gameMode === 'singleplayer' && localGame) {
        const result = localGame.playCard('player1', new Card(card.suit, card.rank));
        if (result.success) updateGameStateView(localGame, 'player1');
        else showAlert('Invalid Move', result.message);
      } else {
        socket?.emit('playCard', { roomId, card });
      }
    }
  };

  const handleChooseSuit = (suit: Suit) => {
    if (suitChoice.card) {
      if (gameMode === 'singleplayer' && localGame) {
        const result = localGame.playCard('player1', new Card(suitChoice.card.suit, suitChoice.card.rank), suit);
        if (result.success) updateGameStateView(localGame, 'player1');
        else showAlert('Invalid Move', result.message);
      } else {
        socket?.emit('playCard', { roomId, card: suitChoice.card, chosenSuit: suit });
      }
      setSuitChoice({ show: false, card: null });
    }
  };

  const handleDrawCard = () => {
    if (gameMode === 'singleplayer' && localGame) {
      const result = localGame.drawCard('player1');
      if (result.success) updateGameStateView(localGame, 'player1');
      else showAlert('Invalid Move', result.message);
    } else {
      socket?.emit('drawCard', { roomId });
    }
  };

  const handlePassTurn = () => {
    if (gameMode === 'singleplayer' && localGame) {
      const result = localGame.passTurn('player1');
      if (result.success) {
        updateGameStateView(localGame, 'player1');
      } else {
        showAlert('Invalid Move', result.message);
      }
    } else {
      socket?.emit('passTurn', { roomId });
    }
  };

  const handleCopyRoomId = () => {
    if (roomId) {
      const id = roomId as string;
      if (Platform.OS === 'web') navigator.clipboard.writeText(id).then(() => showAlert('Copied!', 'ID copied.'));
      else { Clipboard.setString(id); showAlert('Copied!', 'ID copied.'); }
    }
  };

  if (status === 'connecting') return <View style={styles.center}><ActivityIndicator size="large" /><Text>Connecting...</Text></View>;

  if (status === 'waiting') {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Lobby</Text>
        <Text style={styles.infoText}>Share Room ID to invite players:</Text>
        <View style={styles.roomIdContainer}>
          <Text style={styles.roomIdText}>{roomId}</Text>
          <TouchableOpacity style={styles.copyButton} onPress={handleCopyRoomId}><Text style={styles.buttonText}>Copy</Text></TouchableOpacity>
        </View>

        <Text style={styles.title}>Players:</Text>
        <View style={styles.playerList}>
          {Object.values(lobbyPlayers).map((name, index) => (
            <Text key={index} style={styles.playerName}>{name}</Text>
          ))}
        </View>

        {myId === hostId ? (
          <TouchableOpacity style={styles.startButton} onPress={() => socket?.emit('startGame', { roomId })}>
            <Text style={styles.buttonText}>Start Game</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.infoText}>Waiting for the host to start the game...</Text>
        )}

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
      </View>
    );
  }

  if (!game) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <View style={styles.container}>
      <Modal transparent visible={suitChoice.show} onRequestClose={() => setSuitChoice({ show: false, card: null })}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text>Choose a suit</Text>
            {['Hearts', 'Diamonds', 'Clubs', 'Spades'].map(s => (
              <TouchableOpacity key={s} onPress={() => handleChooseSuit(s as Suit)}><Text style={styles.suitChoice}>{s}</Text></TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      <View style={styles.gameArea}>
        {gameMode === 'multiplayer' && (
          <View style={styles.header}>
            <Text style={styles.headerText}>Room: {roomId}</Text>
            <TouchableOpacity style={styles.copyButtonSmall} onPress={handleCopyRoomId}><Text style={styles.copyButtonText}>Copy ID</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { socket?.disconnect(); router.back(); }}><Text style={styles.leaveButtonText}>Leave</Text></TouchableOpacity>
          </View>
        )}
        <View style={styles.opponentInfo}>
          {game.opponents.map(op => <Text key={op.id}>{op.name}: {op.handSize} cards</Text>)}
        </View>
        <View style={styles.deckArea}>
          <View style={styles.actionButtons}>
            {!game?.playerHasDrawn ? (
              <TouchableOpacity onPress={handleDrawCard} disabled={game.turn !== game.myId} style={styles.actionButton}>
                <View style={styles.cardBack} />
                <Text style={styles.actionButtonText}>Draw Card</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handlePassTurn} disabled={game.turn !== game.myId} style={styles.passButton}>
                <Text style={styles.buttonText}>Pass Turn</Text>
              </TouchableOpacity>
            )}
          </View>
          {game.topCard && <CardComponent card={game.topCard} />}
          {game.currentSuit && <Text>Suit: {game.currentSuit}</Text>}
        </View>
        <Text style={styles.statusMessage}>{game.message}</Text>
        <ScrollView horizontal style={styles.hand}>
          {game.myHand.map((card, index) => (
            <TouchableOpacity key={index} onPress={() => handlePlayCard(card)} disabled={game.turn !== game.myId}>
              <CardComponent card={card} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  infoText: { fontSize: 16, marginBottom: 10 },
  roomIdContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  roomIdText: { fontSize: 18, fontWeight: 'bold', marginRight: 10 },
  copyButton: { backgroundColor: '#007AFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 5 },
  copyButtonSmall: { backgroundColor: '#007AFF', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 5, marginHorizontal: 10 },
  copyButtonText: { color: 'white', fontSize: 14 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  leaveButtonText: { color: 'red', fontSize: 14 },
  cancelButton: { backgroundColor: '#dc3545', padding: 15, borderRadius: 8, alignItems: 'center', width: '80%', marginTop: 20 },
  cancelButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  header: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#ccc', backgroundColor: '#f8f8f8' },
  headerText: { fontSize: 16, fontWeight: 'bold' },
  playerList: { marginVertical: 20 },
  playerName: { fontSize: 18, padding: 5 },
  startButton: { backgroundColor: '#28a745', padding: 15, borderRadius: 8, alignItems: 'center', width: '80%', marginTop: 20 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0' },
  gameArea: { flex: 1, width: '100%' },
  opponentInfo: { padding: 10, alignItems: 'center' },
  deckArea: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', padding: 20 },
  cardBack: { width: 70, height: 100, backgroundColor: 'blue', borderRadius: 8 },
  hand: { padding: 10 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 10, alignItems: 'center' },
  suitChoice: { padding: 10, fontSize: 18 },
  statusMessage: { textAlign: 'center', fontSize: 18, fontWeight: 'bold', marginVertical: 10 },
  actionButtons: { alignItems: 'center' },
  actionButton: { alignItems: 'center' },
  actionButtonText: { marginTop: 5, fontSize: 16 },
  passButton: { backgroundColor: '#ffc107', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 8, height: 100, justifyContent: 'center' },
});
