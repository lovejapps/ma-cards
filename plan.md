# Real-Time Two-Player Frontend Refactor Plan

## Notes
- The frontend is being refactored from HTTP/fetch to WebSocket/socket.io for real-time, two-player gameplay.
- The HomeScreen component will now manage the WebSocket connection, handle real-time game state, and update the UI for both players.
- All fetch logic is replaced by socket event emitters and listeners.
- UI now displays opponent status, turn information, and handles real-time updates.
- All TypeScript and lint errors resolved; app ready for browser-based multiplayer testing.
- New requirement: Support multiple concurrent games (rooms) and named users. Players must choose a game name (ID) and a username before joining/creating a game. Backend and frontend both require significant updates to support this.
- Backend now handles player disconnects without crashing, using a removePlayer method.
- When a player attempts an invalid move, an alert is shown and the player can try again (not disconnected).
- New requirement: From home page, allow player to choose multiplayer or play alone with computer.
- Unified game state (`GameView`) now used for both single and multiplayer modes.
- Created shared `types.ts` and reusable `Card.tsx` component to resolve import/type errors.
- Client and server socket event names are now aligned (`createRoom`, `joinRoom`, `roomCreated`).
- Fixed: Infinite loop on multiplayer game creation by correcting useEffect dependencies in game.tsx.
- Fixed: Single-player 'Draw Card' button now works (UI correctly identifies local player).
- New requirement: Support more than 2 players per room, with turn order rotating among all players.
- UI requirement: Only the host sees the "Start Game" button; other players see only the player list in the lobby.
- BUG: When host clicks Start Game, UI does not update for all players; fix lobby-to-game transition for all players.
- New requirement: When a player leaves, remove them from the game state and continue to the next player.
- BUG: Endless loop of game creation when user creates a game.

## Task List
- [x] Integrate socket.io-client into the frontend project.
- [x] Refactor HomeScreen to use WebSocket for game state and actions.
- [x] Update UI to display opponent info and turn status.
- [x] Remove all fetch-based backend communication.
- [x] Test and debug the new real-time frontend implementation.
- [x] Refactor backend to support multiple concurrent games (rooms) with unique IDs and named users.
- [x] Refactor frontend to add a lobby screen for creating/joining games and entering usernames.
- [x] Update game logic and UI to display player names and handle joining specific games.
- [x] Improve backend error handling for disconnects and invalid moves.
- [x] Add frontend alert for invalid moves (do not disconnect player).
- [x] Update UI to display game ID after creation and provide a copy-to-clipboard button.
- [x] Add mode selection to home page: multiplayer or play alone with computer.
- [x] Fix single-player draw card bug.
- [x] Fix infinite loop on multiplayer game creation.
- [x] Test multi-room, multi-user functionality end-to-end.
- [x] Refactor backend and frontend to support >2 players per room and round-robin turns.
- [x] Remove hardcoded 2-player limit in backend joinRoom handler.
- [ ] Polish lobby UI: show Start Game button only to host, others see player list only.
- [x] Fix lobby-to-game transition: ensure all clients update UI when game starts.
- [x] Handle player disconnect: remove from game state and advance turn.
- [x] Fix endless loop of game creation when user creates a game.

## Current Goal
Polish lobby UI: show Start Game button only to host, others see player list only.
Ensure robust multiplayer: handle player disconnects gracefully.