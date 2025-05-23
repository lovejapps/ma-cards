// App.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Button, ScrollView, ActivityIndicator, Alert, TextStyle, Modal, TouchableOpacity } from 'react-native'; // Import Alert, TextStyle, Modal, and TouchableOpacity

// ** IMPORTANT **
// Replace this with the actual URL of your Express backend.
// If running on your computer's localhost, use your local IP address if testing on a physical device.
// Example: const API_URL = 'http://192.168.1.100:3000';
const API_URL = 'http://localhost:3000'; // Use localhost if running in a simulator on the same machine

// Define suits for the suit picker (can also import from backend/card.js if you want)
const SUITS = ['Hearts', 'Diamonds', 'Clubs', 'Spades'] as const; // Use 'as const' for a tuple type
type Suit = typeof SUITS[number]; // Type for a single suit

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King', 'Ace'] as const;
type Rank = typeof RANKS[number]; // Type for a single rank


// Define interface for a Card object (should match the structure from your backend)
interface Card {
    suit: Suit;
    rank: Rank;
}

// Define interface for the Game State object (should match the structure from your backend's getCurrentState method)
interface GameState {
    playerName: string;
    playerHand: Card[];
    topCard: Card | null;
    currentSuit: Suit | null;
    appHandSize: number;
    gameOver: boolean;
    winner: string | null;
    message: string;
    deckSize: number;
    discardPileSize: number;
}


export default function HomeScreen() {
  const [playerName, setPlayerName] = useState<string>('');
  const [game, setGame] = useState<GameState | null>(null); // State can be GameState object or null
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const [showSuitModal, setShowSuitModal] = useState<boolean>(false);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [hasDrawnCard, setHasDrawnCard] = useState<boolean>(false);


  // Function to fetch the current game state from the backend
  const fetchGameState = async () => {
      if (!isGameStarted) return; // Only fetch if a game has been started

      try {
          setLoading(true); // Show loading indicator while fetching
          const response = await fetch(`${API_URL}/state`);
          if (!response.ok) {
              // If the backend isn't running or no game is in progress, handle it
              if (response.status === 404) {
                  setError("No game in progress. Please start a new game.");
                   setGame(null); // Clear previous game state
                   setIsGameStarted(false); // Reset game started state
              } else {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
          }
          const gameState: GameState = await response.json(); // Type assertion
          setGame(gameState);
          setError(null); // Clear any previous errors
          console.log("Fetched game state:", gameState); // Log state for debugging


      } catch (e: any) { // Catch error of type any for flexibility
          console.error("Failed to fetch game state:", e);
          setError(`Failed to connect to the game server or fetch state: ${e.message}. Make sure the backend is running at ${API_URL}`);
          setGame(null); // Clear game state on error
          setIsGameStarted(false); // Reset game started state
      } finally {
           setLoading(false);
      }
  };


    // Fetch game state when the component mounts or when isGameStarted changes
    // This allows reconnecting to an existing game if the app is refreshed and a game is running on the backend
    useEffect(() => {
        if (isGameStarted) {
            fetchGameState();
        }
    }, [isGameStarted]); // Depend on isGameStarted

  // Function to start a new game
  const startGame = async () => {
    if (!playerName) {
      Alert.alert("Please enter your name to start.");
      return;
    }

    setLoading(true);
    setError(null);
    setGame(null); // Clear previous game state
    setIsGameStarted(false); // Ensure game started is false until successful start


    try {
      const response = await fetch(`${API_URL}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerName }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const initialGameState: GameState = await response.json(); // Type assertion
      setGame(initialGameState);
      setIsGameStarted(true); // Set game as started successfully
      console.log("Game started:", initialGameState);

    } catch (e: any) {
      console.error("Failed to start game:", e);
      setError(`Failed to start game: ${e.message}. Make sure the backend is running at ${API_URL}`);
    } finally {
      setLoading(false);
    }
  };

    // Function to render a single card
    const renderCard = (card: Card, index: number, onPress: ((card: Card) => void) | null = null) => { // Add type annotations
        // Determine color for Hearts and Diamonds
        const suitColor: TextStyle['color'] = (card.suit === 'Hearts' || card.suit === 'Diamonds') ? 'red' : 'black';

        return (
            // Use card.suit and card.rank from the object received from backend
            <View key={index} style={styles.card} onStartShouldSetResponder={() => { if(!game?.gameOver && onPress) onPress(card); return true; }}>
                <Text style={styles.cardRank}>{card.rank}</Text>
                <Text style={[styles.cardSuit, { color: suitColor }]}>{getSuitSymbol(card.suit)}</Text>
            </View>
        );
    };

    // Helper to get suit symbol
    const getSuitSymbol = (suit: Suit): string => { // Add type annotations
        switch (suit) {
            case 'Hearts': return '♥';
            case 'Diamonds': return '♦';
            case 'Clubs': return '♣';
            case 'Spades': return '♠';
            default: return ''; // Should not happen with Suit type
        }
    };


  // Function to handle playing a card
  const handlePlayCard = async (cardToPlay: Card) => {
      if (!game) return;
      setLoading(true);

      // If playing an 8, show the suit selection modal
      if (cardToPlay.rank === '8') {
          setSelectedCard(cardToPlay);
          setShowSuitModal(true);
          setLoading(false);
      } else {
          // For non-8 cards, directly send the play request
          sendPlayCard(cardToPlay, null);
      }
  };

  // Function to handle suit selection
  const handleSuitSelection = (suit: Suit) => {
      if (selectedCard) {
          sendPlayCard(selectedCard, suit);
          setShowSuitModal(false);
          setSelectedCard(null);
      }
  };

    // Function to send the play card request to the backend
    const sendPlayCard = async (cardToPlay: Card, chosenSuit: Suit | null) => { // Add type annotations
         try {
             const response = await fetch(`${API_URL}/play`, {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                 },
                 body: JSON.stringify({ card: cardToPlay, chosenSuit }),
             });

             const result: GameState = await response.json(); // Type assertion

             if (!response.ok) {
                  // If backend returns an error (e.g., invalid move)
                  Alert.alert("Invalid Move", result.message || "Could not play card.");
                  setError(result.message || "Could not play card."); // Set error state
                  // Don't fetch game state on invalid move, hand remains the same
             } else {
                 // Successful play, update game state from backend response
                 setGame(result);
                 setError(null); // Clear error
                 setHasDrawnCard(false); // Reset hasDrawnCard after playing a card
                 console.log("Play successful, new game state:", result);

                 // The backend now automatically plays the app's turn after the player's valid move.
                 // The fetched state includes the result of the app's turn.

                 // If the game is not over after the app's turn, maybe fetch state again
                 // after a short delay to clearly show the turn progression?
                 // For now, the state from the /play response is sufficient as it includes app's move.
             }

         } catch (e: any) {
             console.error("Failed to play card:", e);
             setError(`Failed to play card: ${e.message}.`);
         } finally {
             setLoading(false); // Hide loading indicator
         }
    };


    // Function to handle drawing a card
    const handleDrawCard = async () => {
         if (!game) return;
         setLoading(true); // Show loading indicator
         setError(null); // Clear any previous errors

         try {
             const response = await fetch(`${API_URL}/draw`, {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                 },
                 // No body needed for draw
             });

             const result: GameState = await response.json(); // Type assertion

             if (!response.ok) {
                 Alert.alert("Draw Error", result.message || "Could not draw card.");
                 setError(result.message || "Could not draw card."); // Set error state
             } else {
                 setGame(result); // Update game state with the drawn card
                 setError(null); // Clear error
                 setHasDrawnCard(true); // Set hasDrawnCard to true after successful draw
                 console.log("Draw successful, new game state:", result);
                 // After drawing, it's still the player's turn to see if they can play
                 // So no need to trigger app's turn here.
             }

         } catch (e: any) {
             console.error("Failed to draw card:", e);
              setError(`Failed to draw card: ${e.message}.`);
         } finally {
             setLoading(false); // Hide loading indicator
         }
    };

    // Function to handle ending turn
    const handleEndTurn = async () => {
        if (!game) return;
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/end-turn`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const result: GameState = await response.json();

            if (!response.ok) {
                Alert.alert("Error", result.message || "Could not end turn.");
                setError(result.message || "Could not end turn.");
            } else {
                setGame(result);
                setError(null);
                setHasDrawnCard(false); // Reset hasDrawnCard after turn ends
                console.log("Turn ended, new game state:", result);
            }
        } catch (e: any) {
            console.error("Failed to end turn:", e);
            setError(`Failed to end turn: ${e.message}.`);
        } finally {
            setLoading(false);
        }
    };


  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading game...</Text>
      </View>
    );
  }

   if (error) {
       return (
           <View style={styles.container}>
               <Text style={styles.errorText}>{error}</Text>
               {/* Option to retry starting game */}
               <Button title="Start New Game" onPress={() => {
                   setIsGameStarted(false); // Reset to show name input
                    setGame(null); // Clear game state
                    setError(null); // Clear error
               }} />
           </View>
       );
   }


  // If game is not started, show name input
  if (!isGameStarted || !game) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Crazy Eights</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          value={playerName}
          onChangeText={setPlayerName}
        />
        <Button title="Start Game" onPress={startGame} />
      </View>
    );
  }

    // Game is started and we have game state
    const topCard: Card | null = game.topCard; // Add type annotation
    const playerHand: Card[] = game.playerHand; // Add type annotation


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crazy Eights</Text>

      {/* Suit Selection Modal */}
      <Modal
        visible={showSuitModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSuitModal(false);
          setSelectedCard(null);
          setLoading(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Suit</Text>
            <Text style={styles.modalSubtitle}>Select the suit for your 8:</Text>
            <View style={styles.suitButtonsContainer}>
              {SUITS.map((suit) => (
                <TouchableOpacity
                  key={suit}
                  style={styles.suitButton}
                  onPress={() => handleSuitSelection(suit)}
                >
                  <Text style={[styles.suitButtonText, { color: (suit === 'Hearts' || suit === 'Diamonds') ? 'red' : 'black' }]}>
                    {getSuitSymbol(suit)} {suit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowSuitModal(false);
                setSelectedCard(null);
                setLoading(false);
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {game.gameOver ? (
           <View style={styles.gameOverContainer}>
               <Text style={styles.gameOverText}>{game.winner} wins!</Text>
               <Text style={styles.gameMessage}>{game.message}</Text>
                <Button title="Start New Game" onPress={() => {
                    setIsGameStarted(false); // Reset state to show name input
                    setGame(null);
                    setPlayerName('');
                    setError(null); // Clear error
                }} />
           </View>
      ) : (
           <View style={styles.gameArea}>
               {/* Game Message */}
               <Text style={styles.gameMessage}>{game.message}</Text>


               {/* App's Hand (Show number of cards) */}
               <Text style={styles.handTitle}>App's Hand ({game.appHandSize} cards)</Text>
               {/* In a real game, you wouldn't show the app's cards */}

               {/* Discard Pile */}
               <View style={styles.discardPile}>
                    <Text style={styles.handTitle}>Top Card:</Text>
                   {topCard ? renderCard(topCard, 0) : <Text>Empty discard pile</Text>} {/* Pass index 0 for single card */}
                    {/* Display current suit if set */}
                    {game.currentSuit && (
                         <Text style={styles.currentSuitText}>Current Suit: {getSuitSymbol(game.currentSuit)} {game.currentSuit}</Text>
                    )}
               </View>

               {/* Player's Hand */}
               <Text style={styles.handTitle}>{game.playerName}'s Hand ({playerHand.length} cards)</Text>
               <ScrollView horizontal style={styles.handContainer} contentContainerStyle={styles.handContentContainer}>
                   {/* Render each card in the player's hand, making them pressable */}
                   {playerHand.map((card, index) => renderCard(card, index, handlePlayCard))}
               </ScrollView>

                {/* Actions */}
               <View style={styles.actionsContainer}>
                    <Button 
                        title="Draw Card" 
                        onPress={handleDrawCard} 
                        disabled={game.gameOver || loading || hasDrawnCard} 
                    />
                    {hasDrawnCard && (
                        <Button 
                            title="End Turn" 
                            onPress={handleEndTurn} 
                            disabled={game.gameOver || loading} 
                        />
                    )}
               </View>
                {/* Optional: Display Deck Size */}
               {/* <Text style={styles.deckInfo}>Deck: {game.deckSize} cards, Discard: {game.discardPileSize}</Text> */}


           </View>
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e0e0e0', // Light grey background
    alignItems: 'center',
    // justifyContent: 'center', // Removed to allow content to flow
    padding: 20,
    paddingTop: 50, // Add some padding at the top
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  input: {
    width: '80%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
   gameArea: {
       flex: 1, // Take up available space
       width: '100%',
       alignItems: 'center',
   },
   gameMessage: {
        fontSize: 16,
        marginBottom: 15,
        textAlign: 'center',
        color: '#555',
        minHeight: 20, // Reserve space to prevent jumping
   },
   handTitle: {
       fontSize: 18,
       fontWeight: 'bold',
       marginTop: 15,
       marginBottom: 10,
       color: '#444',
   },
   handContainer: {
       flexDirection: 'row',
       marginBottom: 20,
       paddingVertical: 10, // Add some vertical padding for scroll view
       width: '100%', // Ensure scroll view takes full width
   },
    handContentContainer: {
        paddingHorizontal: 5, // Add some padding to the sides of the scroll view content
    },
   card: {
       width: 60, // Card width
       height: 90, // Card height
       backgroundColor: '#fff',
       borderRadius: 8,
       borderWidth: 1,
       borderColor: '#999',
       marginRight: 10, // Space between cards
       justifyContent: 'center',
       alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 1, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3, // For Android shadow
   },
   cardRank: {
       fontSize: 24,
       fontWeight: 'bold',
       color: '#333',
   },
    cardSuit: {
       fontSize: 20,
       // color will be set inline based on suit
    },
    discardPile: {
        marginTop: 20,
        alignItems: 'center',
        marginBottom: 20,
    },
    currentSuitText: {
        fontSize: 16,
        marginTop: 5,
        color: '#007bff', // Highlight current suit
        fontWeight: 'bold',
    },
    actionsContainer: {
        marginTop: 20,
         flexDirection: 'row', // Arrange buttons horizontally
         justifyContent: 'space-around', // Distribute space around buttons
         width: '80%', // Control width of the actions area
         gap: 10, // Add gap between buttons
    },
    gameOverContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gameOverText: {
         fontSize: 24,
         fontWeight: 'bold',
         color: 'green',
         marginBottom: 10,
    },
     errorText: {
         fontSize: 16,
         color: 'red',
         textAlign: 'center',
         marginBottom: 20,
     },
     deckInfo: {
         fontSize: 14,
         marginTop: 10,
         color: '#666',
     },
     modalOverlay: {
       flex: 1,
       backgroundColor: 'rgba(0, 0, 0, 0.5)',
       justifyContent: 'center',
       alignItems: 'center',
     },
     modalContent: {
       backgroundColor: 'white',
       borderRadius: 10,
       padding: 20,
       width: '80%',
       maxWidth: 400,
       alignItems: 'center',
     },
     modalTitle: {
       fontSize: 24,
       fontWeight: 'bold',
       marginBottom: 10,
       color: '#333',
     },
     modalSubtitle: {
       fontSize: 16,
       marginBottom: 20,
       color: '#666',
     },
     suitButtonsContainer: {
       width: '100%',
       marginBottom: 20,
     },
     suitButton: {
       backgroundColor: '#f0f0f0',
       padding: 15,
       borderRadius: 8,
       marginBottom: 10,
       alignItems: 'center',
     },
     suitButtonText: {
       fontSize: 18,
       fontWeight: 'bold',
     },
     cancelButton: {
       padding: 10,
       borderRadius: 5,
       backgroundColor: '#ff4444',
       width: '100%',
       alignItems: 'center',
     },
     cancelButtonText: {
       color: 'white',
       fontSize: 16,
       fontWeight: 'bold',
     },
});
