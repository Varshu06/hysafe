import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { COLORS } from '../../utils/constants';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'outlined' | 'elevated';
}

export const Card: React.FC<CardProps> = ({ children, style, variant = 'elevated', ...props }) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'outlined':
        return styles.outlined;
      case 'elevated':
        return styles.elevated;
      default:
        return {};
    }
  };

  return (
    <View style={[styles.card, getVariantStyle(), style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  outlined: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});



