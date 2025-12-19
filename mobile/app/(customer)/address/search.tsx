import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SAVED_ADDRESSES } from '../../../src/data/dummy';
import { COLORS } from '../../../src/utils/constants';

export default function AddressSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showAllAddresses, setShowAllAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(SAVED_ADDRESSES[0]?.id || null);

  const handleUseCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please enable location permissions in your device settings to use this feature.',
          [{ text: 'OK' }]
        );
        setIsLoadingLocation(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Get address from coordinates
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Navigate to confirm location screen (add address screen) with location data
      router.push({
        pathname: '/(customer)/address/add',
        params: {
          latitude: location.coords.latitude.toString(),
          longitude: location.coords.longitude.toString(),
          street: address?.street || '',
          city: address?.city || '',
          region: address?.region || '',
          postalCode: address?.postalCode || '',
          name: address?.name || '',
          fromCurrentLocation: 'true',
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to get your location. Please try again.');
      console.error('Location error:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleAddNewAddress = () => {
    router.push('/(customer)/address/add');
  };

  // Sort addresses to show selected address first
  const sortedAddresses = [...SAVED_ADDRESSES].sort((a, b) => {
    if (a.id === selectedAddressId) return -1;
    if (b.id === selectedAddressId) return 1;
    return 0;
  });

  const displayedAddresses = showAllAddresses ? sortedAddresses : sortedAddresses.slice(0, 3);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enter your area or apartment name</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#64748B" style={styles.searchIcon} />
        <TextInput 
           placeholder="Tr Jp nagar, siri gardeniam, etc." 
           style={styles.searchInput}
           placeholderTextColor="#94A3B8"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Use Current Location */}
      <TouchableOpacity 
        style={styles.locationRow} 
        onPress={handleUseCurrentLocation}
        disabled={isLoadingLocation}
      >
        <View style={styles.locationIconContainer}>
          <Ionicons name="locate-outline" size={22} color={COLORS.text} />
        </View>
        <Text style={styles.locationText}>Use my current location</Text>
        {isLoadingLocation ? (
          <ActivityIndicator size="small" color={COLORS.text} />
        ) : (
          <Feather name="chevron-right" size={22} color={COLORS.text} />
        )}
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* Add New Address */}
      <TouchableOpacity style={styles.addNewRow} onPress={handleAddNewAddress}>
        <View style={styles.addIconContainer}>
          <MaterialIcons name="add-location-alt" size={22} color={COLORS.text} />
        </View>
         <Text style={styles.addNewText}>Add new address</Text>
      </TouchableOpacity>
      
      {/* Saved Address Section */}
      <View style={styles.sectionDivider}>
        <View style={styles.sectionLine} />
        <Text style={styles.sectionTitle}>Saved Address</Text>
        <View style={styles.sectionLine} />
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {displayedAddresses.map((addr) => {
          const isSelected = addr.id === selectedAddressId;
          return (
            <TouchableOpacity 
              key={addr.id} 
              style={[styles.addressItem, isSelected && styles.selectedAddressItem]}
              onPress={() => {
                setSelectedAddressId(addr.id);
                // Update address and redirect to home page
                router.push('/(customer)');
              }}
            >
              <View style={styles.addressIconContainer}>
                {addr.type === 'Home' ? (
                  <Feather name="home" size={20} color={COLORS.text} />
                ) : addr.type === 'Office' || addr.type === 'Work' ? (
                  <Ionicons name="business-outline" size={20} color={COLORS.text} />
                ) : addr.type === 'Friends and Family' ? (
                  <Ionicons name="people-outline" size={20} color={COLORS.text} />
                ) : (
                  <Ionicons name="navigate-outline" size={20} color={COLORS.text} />
                )}
              </View>
              <View style={styles.addressContent}>
                <View style={styles.addressTypeRow}>
                    <Text style={styles.addressType}>{addr.type}</Text>
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedText}>Selected</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.addressDetail} numberOfLines={1}>{addr.address}</Text>
            </View>
              <TouchableOpacity style={styles.moreButton}>
                <Feather name="more-vertical" size={20} color={COLORS.text} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        {sortedAddresses.length > 3 && !showAllAddresses && (
          <TouchableOpacity 
            style={styles.viewAllButton}
            onPress={() => setShowAllAddresses(true)}
          >
            <Text style={styles.viewAllText}>View All</Text>
            <Feather name="chevron-down" size={18} color={COLORS.text} />
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F4FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  locationIconContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    marginHorizontal: 16,
  },
  addNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  addIconContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addNewText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
  },
  sectionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderStyle: 'dashed',
  },
  sectionTitle: {
    fontSize: 13,
    color: '#64748B',
    marginHorizontal: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  selectedAddressItem: {
    backgroundColor: 'rgba(16, 40, 65, 0.05)',
    borderWidth: 2,
    borderColor: '#102841',
  },
  addressIconContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressContent: {
    flex: 1,
    marginLeft: 8,
  },
  addressTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  addressType: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  selectedBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#102841',
    borderRadius: 10,
  },
  selectedText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
  },
  addressDetail: {
    fontSize: 13,
    color: '#64748B',
  },
  moreButton: {
    padding: 8,
  },
  viewAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: '600',
      color: COLORS.text,
    marginRight: 6,
  },
});
