import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { storage } from '@/helpers/storage';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setUser, clearUser } from '../store/userSlice';

const WEBSOCKET_URL = process.env.EXPO_PUBLIC_WEBSOCKET_URL || "https://macards.api.lovejapps.com";
export default function LoginScreen() {
  const [playerName, setPlayerName] = useState('');
  const [apiReady, setApiReady] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.displayName ? { displayName: state.user.displayName } : null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${WEBSOCKET_URL}/api/health`);
        const data = await response.json();
        console.log('Server health:', data);
        setApiReady(true);
      } catch (error) {
        console.error('Error checking server health:', error);
      }
    };

    const getPlayerName = async () => {
      const user = await storage.getItem('user');
      if (user) {
        const parsed = JSON.parse(user);
        dispatch(setUser({ displayName: parsed.displayName }));
        setPlayerName(parsed.displayName);
      }
    };

    checkHealth();
    getPlayerName();
  }, [dispatch]);

  const handleCancel = async () => {
    dispatch(clearUser());
    storage.removeItem('user');
    setPlayerName('');
  }

  const setPlayerNameAndStore = (playerName: string) => {
    if (!playerName.trim()) {
      Alert.alert('Player name is required.', playerName);
      console.log('Player name is required.');
      return;
    }
    dispatch(setUser({ displayName: playerName }));
    storage.setItem('user', JSON.stringify({ displayName: playerName }));
  }
  const handleSelectMultiplayer = async () => {
    try {
      if (playerName) {
        setPlayerNameAndStore(playerName);
        router.push({ pathname: '/multiplayer', params: { gameMode: 'multiplayer', playerName } });
      } else {
        Alert.alert('Login Failed', 'Player name is required.');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An error occurred while trying to select multiplayer mode.');
    }
  };

  const handlePlayWithComputer = () => {
    try {
      if (playerName) {
        setPlayerNameAndStore(playerName);
        router.push({ pathname: '/(tabs)/game', params: { gameMode: 'singleplayer', playerName } });
      } else {
        Alert.alert('Login Failed', 'Player name is required.');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An error occurred while trying to select singleplayer mode.');
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/macards.png')} style={styles.logo} />
      <Text style={styles.title}>{user && user.displayName ? `Welcome ${user.displayName}` : 'Enter your name'}</Text>
      {user ? null : (
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={playerName}
          onChangeText={setPlayerName}
          onSubmitEditing={handlePlayWithComputer}
        />
      )}
      <View style={{width: '80%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
      <TouchableOpacity style={[styles.button, {width: '45%'}]} onPress={handlePlayWithComputer} disabled={!apiReady}>
        <Text style={styles.buttonText}>Play with AI</Text>
      </TouchableOpacity>
      <Text style={styles.buttonText}> Or </Text>
      <TouchableOpacity style={[styles.button, {width: '45%'}]} onPress={handleSelectMultiplayer} disabled={!apiReady}>
        <Text style={styles.buttonText}>Play Multiplayer</Text>
      </TouchableOpacity>
      </View>
      <View style={styles.divider} />
      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  logo: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 20,
    maxWidth: '100%',
    maxHeight: 230,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '80%',
    height: 50,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    padding: 15,
  },
  button: {
    width: '80%',
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
    textAlign: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: '#ccc',
    marginVertical: 30,
  },
  cancelButton: {
    backgroundColor: "#dc3545",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    width: "80%",
    marginTop: 20,
  },
  cancelButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
});
