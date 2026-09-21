import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/context/AuthContext';
import { addressStorage, SavedAddress } from '../../../src/utils/addressStorage';
import { COLORS } from '../../../src/utils/constants';

export default function AddressSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showAllAddresses, setShowAllAddresses] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showMenuForAddress, setShowMenuForAddress] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved addresses - refresh when screen comes into focus
  const loadAddresses = useCallback(async () => {
    const addresses = await addressStorage.getAllAddresses(user);
    setSavedAddresses(addresses);
    if (addresses.length > 0 && !selectedAddressId) {
      setSelectedAddressId(addresses[0].id);
    }
  }, [user, selectedAddressId]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Refresh addresses when screen comes into focus (e.g., when returning from add address screen)
  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [loadAddresses])
  );

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
    } catch (error: any) {
      // Location unavailable - this is expected if location services are disabled
      // Only log if it's not a permission or availability issue
      if (!error.message?.includes('location') && !error.message?.includes('permission')) {
        console.warn('Location error:', error);
      }
      Alert.alert(
        'Location Unavailable',
        'Unable to get your current location. Please make sure location services are enabled in your device settings, or manually search for your address.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleAddNewAddress = () => {
    router.push('/(customer)/address/add');
  };

  // Handle location search with debounce
  const performSearch = async (text: string) => {
    if (!text || text.trim().length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      // First, try to filter saved addresses that match
      const filteredSaved = savedAddresses.filter(addr => 
        addr.address.toLowerCase().includes(text.toLowerCase()) ||
        addr.fullAddress.toLowerCase().includes(text.toLowerCase()) ||
        addr.type.toLowerCase().includes(text.toLowerCase())
      );

      // Try to use expo-location geocoding to search for new addresses
      let geocodeResults: any[] = [];
      try {
        const results = await Location.geocodeAsync(text);
        const detailedResults = await Promise.all(
          results.map(async (result) => {
            try {
              const addresses = await Location.reverseGeocodeAsync({
                latitude: result.latitude,
                longitude: result.longitude,
              });
              const addr = addresses[0];
              if (addr) {
                return {
                  latitude: result.latitude,
                  longitude: result.longitude,
                  name: addr.name || addr.street || text,
                  street: addr.street || '',
                  city: addr.city || '',
                  region: addr.region || '',
                  postalCode: addr.postalCode || '',
                  country: addr.country || '',
                };
              }
            } catch (err) {
              // ignore
            }
            return {
              latitude: result.latitude,
              longitude: result.longitude,
              name: text,
              street: '',
              city: '',
              region: '',
              postalCode: '',
              country: '',
            };
          })
        );

        geocodeResults = detailedResults.map((result, index) => ({
          id: `search-${index}-${Date.now()}`,
          type: 'Search Result',
          address: result.name || text,
          fullAddress: [
            result.name,
            result.street,
            result.city,
            result.region,
            result.postalCode,
            result.country,
          ].filter(Boolean).join(', '),
          location: {
            lat: result.latitude,
            lng: result.longitude,
          },
          isSearchResult: true,
        }));
      } catch (geocodeError) {
        // Geocoding might not be available in all regions
        console.log('Geocoding not available, using saved addresses only');
      }

      // Combine saved addresses and geocode results
      const allResults = [
        ...filteredSaved.map(addr => ({ ...addr, isSearchResult: false })),
        ...geocodeResults,
      ];

      // Remove duplicates based on fullAddress
      const uniqueResults = allResults.filter((result, index, self) =>
        index === self.findIndex((r) => r.fullAddress === result.fullAddress)
      );

      setSearchResults(uniqueResults);
    } catch (error: any) {
      console.error('Search error:', error);
      // Fallback: just filter saved addresses
      const filtered = savedAddresses.filter(addr => 
        addr.address.toLowerCase().includes(text.toLowerCase()) ||
        addr.fullAddress.toLowerCase().includes(text.toLowerCase())
      );
      setSearchResults(filtered.map(addr => ({ ...addr, isSearchResult: false })));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!text || text.trim().length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Debounce search - wait 500ms after user stops typing
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(text);
    }, 500);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSelectSearchResult = (result: any) => {
    // Navigate to add address screen with the selected location
    router.push({
      pathname: '/(customer)/address/add',
      params: {
        latitude: result.location.lat.toString(),
        longitude: result.location.lng.toString(),
        fullAddress: result.fullAddress,
        name: result.address,
        fromSearch: 'true',
      },
    });
    setSearchText('');
    setShowSearchResults(false);
    setSearchResults([]);
  };

  // Sort addresses to show selected address first
  const sortedAddresses = [...savedAddresses].sort((a, b) => {
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
           placeholder="Try Jp nagar, siri gardeniam, etc." 
           style={styles.searchInput}
           placeholderTextColor="#94A3B8"
          value={searchText}
          onChangeText={handleSearch}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setSearchText('');
              setSearchResults([]);
              setShowSearchResults(false);
              if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
              }
            }}
            style={styles.clearButton}
          >
            <Feather name="x" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
        {isSearching && searchText.length > 0 && (
          <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 8 }} />
        )}
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

      {/* Search Results */}
      {showSearchResults && searchResults.length > 0 && (
        <View style={styles.searchResultsContainer}>
          <Text style={styles.searchResultsTitle}>Search Results</Text>
          <ScrollView style={styles.searchResultsList} showsVerticalScrollIndicator={false}>
            {searchResults.map((result) => (
              <TouchableOpacity
                key={result.id}
                style={styles.searchResultItem}
                onPress={() => handleSelectSearchResult(result)}
              >
                <View style={styles.searchResultIcon}>
                  <Ionicons name="location" size={20} color={COLORS.primary} />
                </View>
                <View style={styles.searchResultContent}>
                  <Text style={styles.searchResultName}>{result.address}</Text>
                  <Text style={styles.searchResultAddress} numberOfLines={2}>
                    {result.fullAddress}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={COLORS.textLight} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {showSearchResults && searchResults.length === 0 && !isSearching && searchText.length >= 3 && (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>No results found</Text>
          <Text style={styles.noResultsSubtext}>Try a different search term</Text>
        </View>
      )}

      {/* Add New Address - Only show when not searching */}
      {!showSearchResults && (
        <TouchableOpacity style={styles.addNewRow} onPress={handleAddNewAddress}>
          <View style={styles.addIconContainer}>
            <MaterialIcons name="add-location-alt" size={22} color={COLORS.text} />
          </View>
          <Text style={styles.addNewText}>Add new address</Text>
        </TouchableOpacity>
      )}

      {/* Saved Address Section - Only show when not searching */}
      {!showSearchResults && (
        <>
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
              onPress={async () => {
                setSelectedAddressId(addr.id);
                // Save selected address ID
                await addressStorage.setSelectedAddressId(addr.id);
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
              <TouchableOpacity 
                style={styles.moreButton}
                onPress={(e) => {
                  e.stopPropagation(); // Prevent triggering the parent onPress
                  setShowMenuForAddress(addr.id);
                }}
              >
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
        </>
      )}

      {/* Address Options Menu Modal */}
      <Modal
        visible={showMenuForAddress !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenuForAddress(null)}
      >
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenuForAddress(null)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={async () => {
                if (showMenuForAddress) {
                  // Navigate to edit address (you can implement edit functionality)
                  const address = savedAddresses.find(a => a.id === showMenuForAddress);
                  if (address) {
                    setShowMenuForAddress(null);
                    // Navigate to add/edit address screen with address data
                    router.push({
                      pathname: '/(customer)/address/add',
                      params: {
                        edit: 'true',
                        addressId: address.id,
                        latitude: address.location?.lat?.toString() || '',
                        longitude: address.location?.lng?.toString() || '',
                        fullAddress: address.fullAddress,
                      },
                    });
                  }
                }
              }}
            >
              <Feather name="edit-2" size={20} color={COLORS.text} />
              <Text style={styles.menuItemText}>Edit</Text>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />
            
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={async () => {
                if (showMenuForAddress) {
                  Alert.alert(
                    'Delete Address',
                    'Are you sure you want to delete this address?',
                    [
                      { text: 'Cancel', style: 'cancel', onPress: () => setShowMenuForAddress(null) },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          await addressStorage.removeAddress(showMenuForAddress);
                          // If this was the selected address, clear selection
                          const currentSelected = await addressStorage.getSelectedAddressId();
                          if (currentSelected === showMenuForAddress) {
                            await addressStorage.setSelectedAddressId('');
                          }
                          // Refresh addresses
                          await loadAddresses();
                          setShowMenuForAddress(null);
                        },
                      },
                    ]
                  );
                }
              }}
            >
              <Feather name="trash-2" size={20} color={COLORS.error} />
              <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  backButton: {
    marginRight: 12,
    position: 'absolute',
    left: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
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
  clearButton: {
    padding: 4,
    marginLeft: 8,
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
    marginHorizontal: 20,
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
    paddingHorizontal: 20,
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
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  menuItemDanger: {
    // Additional styling for delete option
  },
  menuItemText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  menuItemTextDanger: {
    color: COLORS.error,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  searchResultsContainer: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  searchResultsList: {
    maxHeight: 400,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchResultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  searchResultAddress: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 18,
  },
  noResultsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
  },
});
