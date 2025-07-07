import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function LobbyScreen() {
  const params = useLocalSearchParams();
  const { playerName } = params;
  const [roomId, setRoomId] = useState('');
  const router = useRouter();

  const handleCreateGame = () => {
    if (!(playerName as string).trim()) {
      Alert.alert('Player name is required.');
      return;
    }
    router.push({ pathname: '/game', params: { gameMode: 'multiplayer', action: 'create', playerName } });
  };

  const handleJoinGame = () => {
    if (!(playerName as string).trim() || !roomId.trim()) {
      Alert.alert('Player name and Room ID are required.');
      return;
    }
    router.push({ pathname: '/game', params: { gameMode: 'multiplayer', action: 'join', playerName, roomId } });
  };

  return (
    <View style={styles.container}>
      <View style={{width: 300, height: 150, backgroundColor: 'white', borderRadius: 10, marginBottom: 10}}>
      <Image source={require('../../assets/images/logo.jpg')} style={{ width: 300, height: 120, borderRadius: 10 }} />
      </View>
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
    padding: 15,
    borderRadius: 8,
    alignItems: 'center', //glass
    overflow: 'visible',
    color: 'green',
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.25)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
    backdropFilter: 'blur(14px) saturate(180%)',
    transitionProperty: 'box-shadow 0.3s',
  },
  buttonText: {
    color: 'grey',
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

