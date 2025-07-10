import React, { useEffect, useCallback } from 'react';

import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Clipboard,
  StatusBar,
  Dimensions,
} from 'react-native';
import { HamburgerMenu } from '../../components/HamburgerMenu';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { io, Socket } from 'socket.io-client';
import { Card as CardComponent } from '@/components/Card';
import { CardHand } from '@/components/CardHand';
import { GameState as ServerGameState, Card as CardType, Suit } from '@/types';
import { GameState as LocalGameState } from '@/logic/gameState';
import { Card } from '../../logic/card';
import { storage } from '@/helpers/storage';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  setSocket, setLocalGame, setGame, setLobbyPlayers,
  setMyId, setHostId, setStatus, setSuitChoice
} from '@/store/gameSlice';
import { clearUser } from '@/store/userSlice';

const WEBSOCKET_URL = process.env.EXPO_PUBLIC_WEBSOCKET_URL || "https://macards.api.lovejapps.com";

// Unified game state type for rendering
export interface GameView {
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
  const dispatch = useAppDispatch();
  const { gameMode, playerName, roomId, action } = params;

  // Redux selectors for game state
  const socket = useAppSelector((state) => state.game.socket);
  const localGame = useAppSelector((state) => state.game.localGame);
  const game = useAppSelector((state) => state.game.game);
  const lobbyPlayers = useAppSelector((state) => state.game.lobbyPlayers);
  const myId = useAppSelector((state) => state.game.myId);
  const hostId = useAppSelector((state) => state.game.hostId);
  const status = useAppSelector((state) => state.game.status);
  const suitChoice = useAppSelector((state) => state.game.suitChoice);



  const showAlert = (title: string, message: string, buttons?: any[]) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
      if (buttons && buttons[0].onPress) buttons[0].onPress();
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  // --- Reset game logic ---
  async function handleResetGame() {
    if (gameMode === 'singleplayer') {
      await storage.setItem('ma_cards_singleplayer', '');
      const newLocalGame = new LocalGameState([playerName as string]);
      dispatch(setLocalGame(newLocalGame));
      updateGameStateView(newLocalGame, 'player1');
    } else if (gameMode === 'multiplayer') {
      if (socket && roomId) {
        socket.emit('resetGame', { roomId });
        // Optionally clear local game state view
        dispatch(setGame(null));
      }
    }
  }

  const handleSwitchPlayerMode = async () => { 
    await storage.setItem('ma_cards_singleplayer', '');
    router.dismiss(2);
  }

  const handleLogoutExit = async () => { 
    await storage.setItem('ma_cards_singleplayer', '');
    await storage.setItem('user', '');
    dispatch(clearUser());
    setTimeout(() => { router.dismiss(2); }, 300);
  }

  const handleCancel = async () => {
    await handleResetGame();
    router.back()
  }

  const updateGameStateView = useCallback((state: LocalGameState | ServerGameState, localPlayerId?: string) => {
    if (state instanceof LocalGameState) {
      const localState = state.getStateForPlayer(localPlayerId || 'player1');
      if(localState) dispatch(setGame(localState as GameView));
    } else {
      // This is a hack to make the server state conform to the GameView
      const serverState = state as any;
      serverState.winner = serverState.winnerName;
      dispatch(setGame(serverState as GameView));
      // Save game view for multiplayer persistence
      if (roomId) {
        storage.setItem(`ma_cards_multiplayer_${roomId}`, JSON.stringify(serverState));
      }
    }
  }, [roomId]);

  // Effect for single player mode with persistence
  useEffect(() => {
    if (gameMode === 'singleplayer') {
      (async () => {
        const saved = await storage.getItem('ma_cards_singleplayer');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const restoredGame = LocalGameState.fromJSON(parsed);
            dispatch(setLocalGame(restoredGame));
            updateGameStateView(restoredGame, 'player1');
            dispatch(setStatus('playing'));
            return;
          } catch {
            // fallback to new game
          }
        }
        const newLocalGame = new LocalGameState([playerName as string]);
        console.log({newLocalGame, called: "called"});
        dispatch(setLocalGame(newLocalGame));
        updateGameStateView(newLocalGame, 'player1');
        dispatch(setStatus('playing'));
      })();
    }
  }, [gameMode, playerName, updateGameStateView]);

  useEffect(() => {
    if (gameMode !== 'multiplayer') return;

    // Try to restore from storage if available
    (async () => {
      if (roomId) {
        const saved = await storage.getItem(`ma_cards_multiplayer_${roomId}`);
        if (saved) {
          try {
            dispatch(setGame(JSON.parse(saved)));
          } catch {}
        }
      }
    })();
  }, [roomId]);

  // Effect for WebSocket connection and event listeners
  useEffect(() => {
    if (gameMode !== 'multiplayer') return;

    console.log({playerName, roomId})
    const newSocket = io(WEBSOCKET_URL);
    dispatch(setSocket(newSocket));

    newSocket.on('connect', () => {
      dispatch(setStatus('waiting'));
      dispatch(setMyId(newSocket.id || null));
    });

    newSocket.on('roomCreated', ({ roomId, playerId, playerName }) => {
      router.setParams({ roomId });
      dispatch(setHostId(playerId));
      dispatch(setLobbyPlayers({ [playerId]: playerName }));
    });

    newSocket.on('playerJoined', ({ players, hostId }) => {
      dispatch(setLobbyPlayers(players));
      dispatch(setHostId(hostId));
    });

    newSocket.on('gameStart', () => dispatch(setStatus('playing')));
    newSocket.on('gameState', (gs: ServerGameState) => updateGameStateView(gs));
    newSocket.on('invalidMove', ({ message }) => showAlert('Invalid Move', message));
    newSocket.on('gameError', ({ message }) => showAlert('Error', message, [{ text: 'OK', onPress: () => router.back() }]));
    newSocket.on('opponentDisconnected', (message) => showAlert('Opponent Left', message, [{ text: 'OK', onPress: () => router.back() }]));
    newSocket.on('disconnect', () => dispatch(setStatus('connecting')));

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
        dispatch(setStatus('waiting'));
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
      dispatch(setSuitChoice({ show: true, card }));
    } else {
      if (gameMode === 'singleplayer' && localGame) {
        const result = localGame.playCard('player1', new Card(card.suit, card.rank));
        if (result.success) {
          updateGameStateView(localGame, 'player1');
          storage.setItem('ma_cards_singleplayer', JSON.stringify(localGame.toJSON()));
        } else showAlert('Invalid Move', result.message);
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
      dispatch(setSuitChoice({ show: false, card: null }));
      // Save after suit choice
      if (gameMode === 'singleplayer' && localGame) {
        storage.setItem('ma_cards_singleplayer', JSON.stringify(localGame.toJSON()));
      }
    }
  };

  const handleDrawCard = () => {
    if (gameMode === 'singleplayer' && localGame) {
      const result = localGame.drawCard('player1');
      if (result.success) {
        updateGameStateView(localGame, 'player1');
        storage.setItem('ma_cards_singleplayer', JSON.stringify(localGame.toJSON()));
      } else showAlert('Invalid Move', result.message);
    } else {
      socket?.emit('drawCard', { roomId });
    }
  };

  const handlePassTurn = () => {
    if (gameMode === 'singleplayer' && localGame) {
      const result = localGame.passTurn('player1');
      if (result.success) {
        updateGameStateView(localGame, 'player1');
        storage.setItem('ma_cards_singleplayer', JSON.stringify(localGame.toJSON()));
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

        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
      </View>
    );
  }

  if (!game) return <View style={styles.center}><ActivityIndicator size="large" /></View>;

  return (
    <View style={styles.container}>
      <Modal transparent visible={suitChoice.show} onRequestClose={() => dispatch(setSuitChoice({ show: false, card: null }))}>
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
        <View style={[styles.headerSafeArea, styles.header]}>
        {gameMode === 'multiplayer' && (
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <Text style={styles.headerText}>Room: {roomId}</Text>
            <TouchableOpacity style={styles.copyButtonSmall} onPress={handleCopyRoomId}><Text style={styles.copyButtonText}>Copy ID</Text></TouchableOpacity>
          </View>
        )}
        {gameMode === 'singleplayer' ? (
          <View style={{height: 20, width: '100%'}}>
            <HamburgerMenu
              items={[
                { label: 'Reset Game', onPress: handleResetGame },
                { label: 'Switch Player Mode', onPress: handleSwitchPlayerMode },
                { label: 'Logout & Exit', onPress: handleLogoutExit }
              ]}
            />
          </View>
          ) : (
            <HamburgerMenu
              items={[
                { label: 'Reset Game', onPress: handleResetGame },
                { label: 'Leave', onPress: () => { socket?.disconnect(); router.back(); } }
              ]}
            />
          )}
        </View>
        <View style={styles.opponentInfo}>
          {game.opponents.map(op => <Text key={op.id}>{op.name}: {op.handSize} cards</Text>)}
        </View>
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
      <View style={styles.hand}>
        <CardHand cards={game.myHand} onCardPress={handlePlayCard} />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  // ... (rest of the styles remain the same)
  headerSafeArea: {
    paddingTop: Platform.OS === "ios" ? 58 : StatusBar.currentHeight || 24,
  },
  hand: {
    padding: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    left: -(Dimensions.get('window').width / 2) + (Platform.OS === "web" ? 80 : 260),
  },
  // ... (rest of the styles remain the same)
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  infoText: { fontSize: 16, marginBottom: 10 },
  roomIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  roomIdText: { fontSize: 18, fontWeight: "bold", marginRight: 10 },
  copyButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  copyButtonSmall: {
    backgroundColor: "#007AFF",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginHorizontal: 10,
  },
  copyButtonText: { color: "white", fontSize: 14 },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  resetButton: {
    backgroundColor: "#dc3545",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    width: "80%",
    marginTop: 20,
    alignSelf: "center",
  },
  leaveButtonText: { color: "red", fontSize: 14 },
  cancelButton: {
    backgroundColor: "#dc3545",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    width: "80%",
    marginTop: 20,
  },
  cancelButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    backgroundColor: "#f8f8f8",
    top: 0,
    position: "absolute",
  },
  headerText: { fontSize: 16, fontWeight: "bold" },
  playerName: { fontSize: 18, padding: 5 },
  startButton: {
    backgroundColor: "#28a745",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    width: "80%",
    marginTop: 20,
  },
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  gameArea: { width: "100%" },
  opponentInfo: { padding: 10, alignItems: "center", marginTop: 100, zIndex: 0 },
  deckArea: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    padding: 20,
  },
  cardBack: {
    width: 70,
    height: 100,
    backgroundColor: "blue",
    borderRadius: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  suitChoice: { padding: 10, fontSize: 18 },
  statusMessage: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
  },
  actionButtons: { alignItems: "center" },
  actionButton: { alignItems: "center" },
  actionButtonText: { marginTop: 5, fontSize: 16 },
  passButton: {
    backgroundColor: "#ffc107",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    height: 100,
    justifyContent: "center",
  },
});
