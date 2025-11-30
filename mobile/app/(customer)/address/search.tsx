import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { RECENT_SEARCHES, SAVED_ADDRESSES } from '../../../src/data/dummy';
import { COLORS } from '../../../src/utils/constants';

export default function AddressSearchScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
           <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enter your area or apartment name</Text>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput 
           placeholder="Tr Jp nagar, siri gardeniam, etc." 
           style={styles.searchInput}
           placeholderTextColor="#94A3B8"
        />
      </View>

      <TouchableOpacity style={styles.currentLocationRow} onPress={() => router.push('/(customer)/address/add')}>
         <Text style={styles.gpsIcon}>📍</Text>
         <Text style={styles.gpsText}>Use my current location</Text>
         <Text style={styles.arrowIcon}>›</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity style={styles.addNewRow} onPress={() => router.push('/(customer)/address/add')}>
         <Text style={styles.plusIcon}>+</Text>
         <Text style={styles.addNewText}>Add new address</Text>
      </TouchableOpacity>
      
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Saved Address</Text>
        {SAVED_ADDRESSES.map((addr) => (
          <TouchableOpacity key={addr.id} style={styles.addressItem}>
            <View style={styles.addressLeft}>
                <Text style={styles.addressIcon}>{addr.type === 'Home' ? '🏠' : '🏢'}</Text>
                <View>
                    <Text style={styles.addressType}>{addr.type}</Text>
                    <Text style={styles.addressDetail} numberOfLines={1}>{addr.address}</Text>
                </View>
            </View>
            <TouchableOpacity>
                <Text style={styles.dots}>⋮</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Recent Search</Text>
        {RECENT_SEARCHES.map((search, index) => (
           <TouchableOpacity key={index} style={styles.recentItem}>
              <Text style={styles.recentIcon}>🕒</Text>
              <View>
                 <Text style={styles.recentTitle}>{search.split(',')[0]}</Text>
                 <Text style={styles.recentDetail} numberOfLines={1}>{search}</Text>
              </View>
           </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  backIcon: {
    fontSize: 24,
    color: COLORS.text,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.text,
    marginBottom: 20,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  currentLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  gpsIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  gpsText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  arrowIcon: {
    fontSize: 20,
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 20,
  },
  addNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  plusIcon: {
    fontSize: 20,
    marginRight: 12,
    fontWeight: 'bold',
  },
  addNewText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  addressItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  addressLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  addressIcon: {
    fontSize: 20,
  },
  addressType: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: COLORS.text,
  },
  addressDetail: {
    fontSize: 14,
    color: '#64748B',
  },
  dots: {
    fontSize: 20,
    color: COLORS.text,
    paddingHorizontal: 8,
  },
  recentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 20,
  },
  recentIcon: {
      fontSize: 20,
      color: '#64748B',
  },
  recentTitle: {
      fontSize: 16,
      color: COLORS.text,
      marginBottom: 2,
  },
  recentDetail: {
      fontSize: 14,
      color: '#64748B',
  }
});

