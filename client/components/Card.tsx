import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card as CardType, Suit } from '../types';

interface CardProps {
  card: CardType;
}

const suitSymbols: Record<Suit, string> = {
  Hearts: '♥',
  Diamonds: '♦',
  Clubs: '♣',
  Spades: '♠',
};

const shortRank = (rank: string) => rank.length === 2 ? rank.slice(0, 2) : rank[0];
export function Card({ card }: CardProps) {
  const suitColor = card.suit === 'Hearts' || card.suit === 'Diamonds' ? 'red' : 'black';
  return (
    <View style={styles.card}>
      {/* Top left corner rank and suit */}
      {card.rank !== 'Joker' && (
        <>
          <View style={styles.cornerInfoTR}>
            <Text style={[styles.cornerRank, { color: suitColor }]}>{shortRank(card.rank)}</Text>
            <Text style={[styles.cornerSuit, { color: suitColor }]}>{suitSymbols[card.suit]}</Text>
          </View>
          {/* Bottom right corner rank and suit */}
          <View style={styles.cornerInfoBL}>
            <Text style={[styles.cornerSuit, { color: suitColor }]}>{suitSymbols[card.suit]}</Text>
            <Text style={[styles.cornerRank, { color: suitColor }]}>{shortRank(card.rank)}</Text>
          </View>
        </>
      )}
      {card.rank === 'Joker' ? (
        <>
          {/* Vertically oriented JOKER on left side */}
          <View style={styles.jokerVerticalContainer}>
            <Text style={[styles.jokerVerticalText, { color: suitColor }]}>JOKER</Text>
          </View>
          <Text style={[styles.jokerText, { color: suitColor }]}>JOKER</Text>
        </>
      ) : (
        <>
          <Text style={[styles.cardRank, { color: suitColor }]}>{card.rank}</Text>
          <Text style={[styles.cardSuit, { color: suitColor }]}>{suitSymbols[card.suit]}</Text>
        </>
      )}
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
    overflow: 'hidden',
  },
  cornerInfoTR: {
    position: 'absolute',
    top: 4,
    right: 6,
    alignItems: 'flex-end',
    zIndex: 10,
  },
  cornerRank: {
    fontSize: 14,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  cornerSuit: {
    fontSize: 14,
    lineHeight: 16,
  },
  cornerInfoBL: {
    position: 'absolute',
    bottom: 4,
    left: 6,
    alignItems: 'flex-start',
    zIndex: 10,
  },
  cardRank: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  cardSuit: {
    fontSize: 24,
  },
  jokerText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  jokerVerticalContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: 24,
    zIndex: 10,
  },
  jokerVerticalText: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
    transform: [{ rotate: '360deg' }],
  },
});
