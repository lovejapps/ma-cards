import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card as CardType } from '../types';

interface CardProps {
  card: CardType;
}

export function Card({ card }: CardProps) {
  const suitColor = card.suit === 'Hearts' || card.suit === 'Diamonds' ? 'red' : 'black';
  return (
    <View style={styles.card}>
      <Text style={[styles.cardRank, { color: suitColor }]}>{card.rank}</Text>
      <Text style={[styles.cardSuit, { color: suitColor }]}>{card.suit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 80,
    height: 120,
    backgroundColor: 'white',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardRank: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  cardSuit: {
    fontSize: 16,
  },
});
