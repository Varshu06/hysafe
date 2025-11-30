import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/utils/constants';

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { login } = useAuth();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(18);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleOtpChange = (text: string, index: number) => {
      const newOtp = [...otp];
      newOtp[index] = text;
      setOtp(newOtp);

      if (text && index < 5) {
          inputs.current[index + 1]?.focus();
      }
      
      if (index === 5 && text && newOtp.every(d => d !== '')) {
         verifyOtp(newOtp.join(''));
      }
  };

  const handleKeyPress = (e: any, index: number) => {
      if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
          inputs.current[index - 1]?.focus();
      }
  };

  const verifyOtp = async (otpValue: string) => {
      setLoading(true);
      try {
          await new Promise(resolve => setTimeout(resolve, 1500));
          const phoneNumber = params.phone as string;
          await login({ phone: phoneNumber, password: 'otp-login' });
      } catch (error) {
          alert('Invalid OTP');
      } finally {
          setLoading(false);
      }
  };

  return (
    <View style={styles.container}>
      {/* Header with Water Theme */}
      <View style={styles.headerBg}>
          <View style={styles.headerBubble} />
      </View>

      <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>OTP Verification</Text>
      </View>

      <View style={styles.content}>
          <Text style={styles.subtitle}>We have sent a verification code to</Text>
          <Text style={styles.phone}>{params.phone || '+91-9342981893'}</Text>

          <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                  <TextInput
                      key={index}
                      ref={ref => inputs.current[index] = ref}
                      style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                      maxLength={1}
                      keyboardType="number-pad"
                      value={digit}
                      onChangeText={(text) => handleOtpChange(text, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      selectionColor={COLORS.primary}
                  />
              ))}
          </View>
          
          <TouchableOpacity style={styles.resendLink} disabled={timer > 0}>
              <Text style={[styles.resendText, timer > 0 && styles.disabledText]}>
                 Didn't get the OTP? Resend SMS in {timer}s
              </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.goBack} onPress={() => router.back()}>
              <Text style={styles.goBackText}>Go back to login methods</Text>
          </TouchableOpacity>

          {loading && <ActivityIndicator style={{marginTop: 20}} color={COLORS.primary} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  headerBg: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 150,
      backgroundColor: COLORS.accent,
      borderBottomRightRadius: 50,
      zIndex: 0,
  },
  headerBubble: {
      position: 'absolute',
      top: -20,
      left: -20,
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: COLORS.primaryLight,
      opacity: 0.2,
  },
  header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 60,
      paddingHorizontal: 20,
      marginBottom: 40,
      zIndex: 1,
  },
  backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'white',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 20,
      elevation: 2,
  },
  backIcon: {
      fontSize: 24,
      color: COLORS.text,
  },
  title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: COLORS.text,
  },
  content: {
      alignItems: 'center',
      paddingHorizontal: 20,
  },
  subtitle: {
      fontSize: 16,
      color: COLORS.textLight,
      marginBottom: 8,
  },
  phone: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 40,
      color: COLORS.text,
  },
  otpContainer: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 30,
  },
  otpBox: {
      width: 45,
      height: 55,
      borderWidth: 1.5,
      borderColor: COLORS.border,
      borderRadius: 12,
      textAlign: 'center',
      fontSize: 22,
      fontWeight: 'bold',
      backgroundColor: '#F8FAFC',
      color: COLORS.text,
  },
  otpBoxFilled: {
      borderColor: COLORS.primary,
      backgroundColor: COLORS.accent,
  },
  resendLink: {
      marginBottom: 50,
  },
  resendText: {
      color: COLORS.primary,
      fontSize: 14,
      fontWeight: '600',
  },
  disabledText: {
      color: COLORS.textLight,
  },
  goBack: {
      padding: 10,
  },
  goBackText: {
      color: COLORS.error,
      fontWeight: '600',
      fontSize: 15,
  }
});
