import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    ImageBackground,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../../src/utils/constants';

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!phone || phone.length < 10) {
      alert('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    setTimeout(() => {
        setLoading(false);
        router.push({ pathname: '/(auth)/otp', params: { phone: phone } });
    }, 1000);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Water Theme Header */}
      <ImageBackground 
        source={require('../../src/assets/loginimage.png')} 
        style={styles.headerContainer}
        resizeMode="cover"
      >
         <View style={styles.overlay} />
         <View style={styles.headerWave} />
      </ImageBackground>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Hy-Safe</Text>
        <Text style={styles.tagline}>Pure Water, Delivered Fast.</Text>
        <Text style={styles.subtitle}>Login to order fresh cans anytime, anywhere.</Text>
        
        <View style={styles.dividerContainer}>
            <View style={styles.line} />
            <Text style={styles.dividerText}>Log in or sign up</Text>
            <View style={styles.line} />
        </View>

        <View style={styles.inputContainer}>
            <View style={styles.countryCode}>
                <Text style={styles.flag}>🇮🇳</Text>
                <Text style={styles.code}>+91</Text>
            </View>
            <TextInput
                style={styles.input}
                placeholder="Enter Phone Number"
                placeholderTextColor={COLORS.textLight}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={10}
            />
        </View>

        <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={loading}
        >
            {loading ? (
                <ActivityIndicator color="white" />
            ) : (
                <Text style={styles.buttonText}>Continue</Text>
            )}
        </TouchableOpacity>

        <Text style={styles.orText}>or</Text>

        <View style={styles.socialContainer}>
            <TouchableOpacity style={styles.socialButton}>
                 <Text style={styles.socialIcon}>G</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
                 <Text style={styles.socialIcon}>📧</Text>
            </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  headerContainer: {
      height: 350, // Increased height to show more image
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
      justifyContent: 'flex-end',
  },
  overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(2, 132, 199, 0.3)', // COLORS.primary with opacity
  },
  headerWave: {
      position: 'absolute',
      bottom: -50,
      width: '150%',
      height: 100,
      backgroundColor: 'white',
      borderTopLeftRadius: 200,
      borderTopRightRadius: 200,
      alignSelf: 'center',
  },
  // Removed bubble1, bubble2, logoArea, headerImage, headerIcon
  content: {
    flexGrow: 1,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  tagline: {
      fontSize: 18,
      fontWeight: '600',
      color: '#0F172A',
      marginBottom: 8,
      textAlign: 'center',
  },
  subtitle: {
      fontSize: 14,
      color: COLORS.textLight,
      marginBottom: 30,
      textAlign: 'center',
      lineHeight: 20,
  },
  dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
      width: '100%',
  },
  line: {
      flex: 1,
      height: 1,
      backgroundColor: COLORS.border,
  },
  dividerText: {
      marginHorizontal: 10,
      color: COLORS.textLight,
      fontWeight: '500',
  },
  inputContainer: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 12,
      padding: 4,
      width: '100%',
      marginBottom: 20,
      height: 56,
      backgroundColor: '#F8FAFC',
  },
  countryCode: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      borderRightWidth: 1,
      borderRightColor: COLORS.border,
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
  },
  flag: {
      fontSize: 18,
      marginRight: 8,
  },
  code: {
      fontSize: 16,
      color: COLORS.text,
      fontWeight: '600',
  },
  input: {
      flex: 1,
      paddingHorizontal: 16,
      fontSize: 16,
      color: COLORS.text,
  },
  button: {
      backgroundColor: COLORS.primary,
      width: '100%',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 24,
      elevation: 2,
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
  },
  buttonDisabled: {
      opacity: 0.7,
  },
  buttonText: {
      color: 'white',
      fontSize: 18,
      fontWeight: 'bold',
  },
  orText: {
      color: COLORS.textLight,
      marginBottom: 24,
  },
  socialContainer: {
      flexDirection: 'row',
      gap: 20,
  },
  socialButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: COLORS.border,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'white',
  },
  socialIcon: {
      fontSize: 24,
  }
});
