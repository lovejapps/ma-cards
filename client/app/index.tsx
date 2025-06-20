import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';

const WEBSOCKET_URL = process.env.EXPO_PUBLIC_WEBSOCKET_URL || "https://macards.api.lovejapps.com";

export default function LoginScreen() {
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
        router.replace('/(tabs)');
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid password.');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'An error occurred while trying to log in.');
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/macards.png')} style={styles.logo} />
      <Text style={styles.title}>Enter invitation code</Text>
      <TextInput
        style={styles.input}
        placeholder="Pass Code"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={handleLogin}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={!apiReady}>
        <Text style={styles.buttonText}>Enter</Text>
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
    width: '100%',
    height: 50,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#007bff',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
