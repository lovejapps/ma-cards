import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HamburgerMenuProps {
  items: { label: string; onPress: () => void }[];
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ items }) => {
  const [open, setOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: open ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [open]);

  const menuHeight = items.length * 48;
  const translateY = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-menuHeight, 0],
  });

  return (
    <View style={styles.menuContainer}>
      <TouchableOpacity onPress={() => setOpen(!open)} style={styles.iconButton}>
        <Ionicons name="menu" size={32} color="#333" />
      </TouchableOpacity>
      {open && (
        <Animated.View style={[styles.dropdown, { transform: [{ translateY }] }]}> 
          {items.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              onPress={() => {
                setOpen(false);
                setTimeout(item.onPress, 100); // close before action
              }}
            >
              <Text style={styles.menuItemText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  menuContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 1000,
    padding: 10,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    minWidth: 140,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
});
