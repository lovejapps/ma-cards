import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

const WEBSOCKET_URL = process.env.EXPO_PUBLIC_WEBSOCKET_URL || "https://macards.api.lovejapps.com";

export default function LoginScreen() {
  const params = useLocalSearchParams();
  const { playerName } = params;
  const [password, setPassword] = useState('');
  const [apiReady, setApiReady] = useState(false);
  const router = useRouter();

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
  
      checkHealth();
    }, []);

  const handleLogin = async () => {
    try {
      const response = await fetch(`${WEBSOCKET_URL}/api/validate-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPassword('');
        router.push({ pathname: '/(tabs)', params: { gameMode: 'multiplayer', playerName } });
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid password.');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An error occurred while trying to select multiplayer mode.');
    }
  };

  const handleCancel = async () => {
    router.back()
  }

  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/macards.png')} style={styles.logo} />
      <Text style={styles.title}>Enter password</Text>
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={handleLogin}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={!apiReady}>
        <Text style={styles.buttonText}>Enter</Text>
      </TouchableOpacity>
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
