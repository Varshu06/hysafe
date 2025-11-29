import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { useAuth } from '../../src/context/AuthContext';
import { useOrder } from '../../src/context/OrderContext';
import { createOrder } from '../../src/services/order.service';
import { COLORS } from '../../src/utils/constants';

export default function HomeScreen() {
  const { isAuthenticated } = useAuth();
  const { refreshOrders } = useOrder();
  const router = useRouter();
  const [quantity, setQuantity] = useState('1');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'offline'>('offline');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to place an order');
      router.push('/(auth)/login');
      return;
    }

    if (!deliveryAddress.trim()) {
      Alert.alert('Error', 'Please enter delivery address');
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    try {
      setIsLoading(true);

      // Get location if permission granted
      let location = undefined;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          location = {
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
          };
        }
      } catch (error) {
        console.log('Location permission denied or error:', error);
      }

      await createOrder({
        quantity: qty,
        deliveryAddress: deliveryAddress.trim(),
        paymentMethod,
        notes: notes.trim() || undefined,
        location,
      });

      Alert.alert('Success', 'Order placed successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setQuantity('1');
            setDeliveryAddress('');
            setNotes('');
            refreshOrders();
            router.push('/(customer)/orders');
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to place order');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to Hy-Safe</Text>
        <Text style={styles.subtitle}>Login to place your order</Text>
        <Button
          title="Login"
          onPress={() => router.push('/(auth)/login')}
          style={styles.loginButton}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Place New Order</Text>
      <Text style={styles.subtitle}>Order 20L water cans</Text>

      <View style={styles.form}>
        <View style={styles.quantityContainer}>
          <Text style={styles.label}>Quantity (20L cans)</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => {
                const qty = Math.max(1, parseInt(quantity) - 1);
                setQuantity(qty.toString());
              }}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityValue}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => {
                const qty = parseInt(quantity) + 1;
                setQuantity(qty.toString());
              }}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Input
          placeholder="Delivery Address *"
          value={deliveryAddress}
          onChangeText={setDeliveryAddress}
          multiline
          numberOfLines={3}
          style={styles.textArea}
        />

        <View style={styles.paymentContainer}>
          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.paymentOptions}>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'offline' && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod('offline')}
            >
              <Text
                style={[
                  styles.paymentOptionText,
                  paymentMethod === 'offline' && styles.paymentOptionTextActive,
                ]}
              >
                Cash on Delivery
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'online' && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod('online')}
            >
              <Text
                style={[
                  styles.paymentOptionText,
                  paymentMethod === 'online' && styles.paymentOptionTextActive,
                ]}
              >
                Online Payment
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Input
          placeholder="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={2}
          style={styles.textArea}
        />

        <Button
          title="Place Order"
          onPress={handlePlaceOrder}
          loading={isLoading}
          style={styles.button}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 24,
  },
  form: {
    width: '100%',
  },
  quantityContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  quantityButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    color: COLORS.secondary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  quantityValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    minWidth: 40,
    textAlign: 'center',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  paymentContainer: {
    marginBottom: 20,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentOption: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
  },
  paymentOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.accent,
  },
  paymentOptionText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  paymentOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  button: {
    marginTop: 8,
  },
  loginButton: {
    marginTop: 20,
    minWidth: 120,
  },
});



