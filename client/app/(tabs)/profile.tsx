import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../../store/hooks';

export default function LobbyScreen() {
  const router = useRouter();
  const playerName = useAppSelector(state => state.user.displayName) || 'Not set';

  const handleCancel = async () => {
    router.back()
  }

  return (
    <View style={styles.container}>
      <View style={{width: 300, height: 150, backgroundColor: 'white', borderRadius: 10, marginBottom: 10}}>
      <Image source={require('../../assets/images/logo.jpg')} style={{ width: 300, height: 120, borderRadius: 10 }} />
      </View>
      <Text style={styles.title}>Profile</Text>
      <View>
        <Text style={styles.buttonText}>
          Player Name: {playerName}
        </Text>
      </View>

      <View style={styles.divider} />
      <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
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
    width: '80%',
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: 'white',
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

