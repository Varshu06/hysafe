import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../src/utils/constants';

export default function AdminInventoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inventory</Text>
      <Text style={styles.subtitle}>Manage stock levels</Text>
      {/* TODO: Implement inventory management */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent,
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
  },
});




