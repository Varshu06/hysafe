import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { getAllStaff } from '../../src/services/admin.service';
import { COLORS } from '../../src/utils/constants';

export default function AdminStaffScreen() {
  const router = useRouter();
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const data = await getAllStaff();
      setStaff(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStaffCard = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.name}>{item.name}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.id}>ID: {item.id}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.actionContainer}>
        <Button 
            title="+ Add New User" 
            onPress={() => router.push('/(admin)/add-user')}
            variant="primary"
        />
      </View>
      <FlatList
        data={staff}
        renderItem={renderStaffCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={fetchStaff} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.accent,
  },
  actionContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  id: {
    fontSize: 12,
    color: COLORS.textLight,
  },
});



