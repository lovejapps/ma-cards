import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Socket } from 'socket.io-client';
import { GameState as LocalGameState } from '@/logic/gameState';
import { Card as CardType } from '@/types';
import { GameView } from '@/app/(tabs)/game';

interface GameState {
  socket: Socket | null;
  localGame: LocalGameState | null;
  game: GameView | null;
  lobbyPlayers: { [id: string]: string };
  myId: string | null;
  hostId: string | null;
  status: string;
  suitChoice: { show: boolean; card: CardType | null };
}

const initialState: GameState = {
  socket: null,
  localGame: null,
  game: null,
  lobbyPlayers: {},
  myId: null,
  hostId: null,
  status: 'connecting',
  suitChoice: { show: false, card: null },
};

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setSocket(state, action: PayloadAction<Socket | null>) {
      state.socket = action.payload;
    },
    setLocalGame(state, action: PayloadAction<LocalGameState | null>) {
      state.localGame = action.payload;
    },
    setGame(state, action: PayloadAction<GameView | null>) {
      state.game = action.payload;
    },
    setLobbyPlayers(state, action: PayloadAction<{ [id: string]: string }>) {
      state.lobbyPlayers = action.payload;
    },
    setMyId(state, action: PayloadAction<string | null>) {
      state.myId = action.payload;
    },
    setHostId(state, action: PayloadAction<string | null>) {
      state.hostId = action.payload;
    },
    setStatus(state, action: PayloadAction<string>) {
      state.status = action.payload;
    },
    setSuitChoice(state, action: PayloadAction<{ show: boolean; card: CardType | null }>) {
      state.suitChoice = action.payload;
    },
    resetGameState(state) {
      state.localGame = null;
      state.game = null;
      state.lobbyPlayers = {};
      state.myId = null;
      state.hostId = null;
      state.status = 'connecting';
      state.suitChoice = { show: false, card: null };
    },
  },
});

export const {
  setSocket,
  setLocalGame,
  setGame,
  setLobbyPlayers,
  setMyId,
  setHostId,
  setStatus,
  setSuitChoice,
  resetGameState,
} = gameSlice.actions;

export default gameSlice.reducer;
