import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Card } from './Card';
import { Card as CardType } from '../types';

import { TouchableOpacity } from 'react-native';

interface CardHandProps {
  cards: CardType[];
  onCardPress?: (card: CardType) => void;
}

const CARD_WIDTH = 80;
const CARD_HEIGHT = 120;
const MAX_FAN_ANGLE = -10; // degrees
const BASE_CARD_OVERLAP = 28; // px
const MIN_CARD_OVERLAP = 25; // px

export function CardHand({ cards, onCardPress }: CardHandProps) {
  const cardCount = cards.length;
  const angleStep = cardCount > 1 ? MAX_FAN_ANGLE / (cardCount - 1) : 0;
  const startAngle = -MAX_FAN_ANGLE / 2;
  const centerX = Dimensions.get('window').width / 2 - CARD_WIDTH / 2;

  // Dynamically adjust overlap for small hands
  const CARD_OVERLAP = cardCount < 5 ? MIN_CARD_OVERLAP : BASE_CARD_OVERLAP;

  return (
    <View style={styles.handContainer}>
      {cards.map((card, i) => {
        const angle = startAngle + i * angleStep;
        const radius = 150;
        const rad = - (angle * Math.PI) / 180;
        const x = centerX + radius * Math.sin(rad) - i * CARD_OVERLAP;
        const y = radius * (1 + Math.cos(rad)) - 280; // Bring hand up closer to center card
        return (
          <View
            key={`${card.suit}-${card.rank}-${i}`}
            style={[
              styles.cardWrapper,
              {
                left: x,
                top: y,
                transform: [
                  { rotate: `${angle}deg` },
                ],
                zIndex: i,
                position: 'absolute',
              },
            ]}
          >
            <TouchableOpacity activeOpacity={0.8} onPress={() => onCardPress && onCardPress(card)}>
              <Card card={card} />
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  handContainer: {
    display: 'flex',
    flexDirection: 'row',
    width: "100%",
    height: 250,
    position: 'relative',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  cardWrapper: {
    position: 'absolute',
  },
});
