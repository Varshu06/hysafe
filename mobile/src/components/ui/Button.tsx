import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { COLORS } from '../../utils/constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return COLORS.textLight; // Use a distinct disabled color if preferred
    switch (variant) {
      case 'primary': return COLORS.primary;
      case 'secondary': return COLORS.secondary;
      case 'outline': return 'transparent';
      case 'danger': return COLORS.error;
      case 'success': return COLORS.success;
      default: return COLORS.primary;
    }
  };

  const getTextColor = () => {
    if (variant === 'outline' || variant === 'secondary') return COLORS.text; // Or primary for outline
    if (variant === 'outline') return COLORS.primary;
    return COLORS.secondary;
  };

  const buttonStyles = [
    styles.button,
    { backgroundColor: getBackgroundColor() },
    variant === 'outline' && { borderWidth: 1, borderColor: COLORS.primary },
    disabled && { opacity: 0.6 },
    style,
  ];

  const textStyles = [
    styles.text,
    { color: getTextColor() },
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    flexDirection: 'row',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});



