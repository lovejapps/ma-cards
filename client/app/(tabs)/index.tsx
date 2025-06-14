import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function LobbyScreen() {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const router = useRouter();

  const handleCreateGame = () => {
    if (!playerName.trim()) {
      Alert.alert('Player name is required.');
      return;
    }
    router.push({ pathname: '/game', params: { gameMode: 'multiplayer', action: 'create', playerName } });
  };

  const handleJoinGame = () => {
    if (!playerName.trim() || !roomId.trim()) {
      Alert.alert('Player name and Room ID are required.');
      return;
    }
    router.push({ pathname: '/game', params: { gameMode: 'multiplayer', action: 'join', playerName, roomId } });
  };

  const handlePlayWithComputer = () => {
    if (!playerName.trim()) {
      Alert.alert('Player name is required.');
      return;
    }
    router.push({ pathname: '/game', params: { gameMode: 'singleplayer', playerName } });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Crazy Eights</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        value={playerName}
        onChangeText={setPlayerName}
      />
      <TouchableOpacity style={styles.button} onPress={handleCreateGame}>
        <Text style={styles.buttonText}>Create Game</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TextInput
        style={styles.input}
        placeholder="Enter Room ID to join"
        value={roomId}
        onChangeText={setRoomId}
      />
      <TouchableOpacity style={styles.button} onPress={handleJoinGame}>
        <Text style={styles.buttonText}>Join Game</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.button} onPress={handlePlayWithComputer}>
        <Text style={styles.buttonText}>Play with AI</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: 'white',
  },
  button: {
    width: '100%',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: '#ccc',
    marginVertical: 30,
  },
});

