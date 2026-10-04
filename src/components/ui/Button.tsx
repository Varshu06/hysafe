import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import { COLORS } from '../../utils/constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  numberOfLines?: number;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  style,
  textStyle,
  numberOfLines = 1,
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
    if (variant === 'outline') return COLORS.primary;
    if (variant === 'secondary') return COLORS.text;
    return COLORS.secondary;
  };

  const sizeButtonStyles = {
    sm: styles.buttonSm,
    md: styles.buttonMd,
    lg: styles.buttonLg,
  }[size];

  const sizeTextStyles = {
    sm: styles.textSm,
    md: styles.textMd,
    lg: styles.textLg,
  }[size];

  const buttonStyles = [
    styles.button,
    sizeButtonStyles,
    { backgroundColor: getBackgroundColor() },
    variant === 'outline' && { borderWidth: 1, borderColor: COLORS.primary },
    disabled && { opacity: 0.6 },
    style,
  ];

  const textStyles = [
    styles.text,
    sizeTextStyles,
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
        <Text
          style={textStyles}
          numberOfLines={numberOfLines}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonSm: {
    minHeight: 34,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  buttonMd: {
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  buttonLg: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  text: {
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
  },
  textSm: {
    fontSize: 12,
    lineHeight: 16,
  },
  textMd: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
  },
  textLg: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
});



