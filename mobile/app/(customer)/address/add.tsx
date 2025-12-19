import { Feather, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, PanResponder, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../src/utils/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LocationData {
  latitude: number;
  longitude: number;
  street: string;
  city: string;
  region: string;
  postalCode: string;
  name: string;
  fullAddress: string;
}

export default function AddAddressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [houseNumber, setHouseNumber] = useState('');
  const [apartmentRoad, setApartmentRoad] = useState('');
  const [saveAs, setSaveAs] = useState('Home');
  const [saveAsName, setSaveAsName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const hasInitialized = useRef(false);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  
  const fromCurrentLocation = params.fromCurrentLocation === 'true';

  // Initialize with params if coming from "Use my current location"
  useEffect(() => {
    if (hasInitialized.current) return;
    
    if (params.latitude && params.longitude) {
      hasInitialized.current = true;
      const fullAddress = [
        params.name,
        params.street,
        params.city,
        params.region,
        params.postalCode,
      ].filter(Boolean).join(', ');
      
      setLocationData({
        latitude: parseFloat(params.latitude as string),
        longitude: parseFloat(params.longitude as string),
        street: params.street as string || '',
        city: params.city as string || '',
        region: params.region as string || '',
        postalCode: params.postalCode as string || '',
        name: params.name as string || '',
        fullAddress,
      });
    } else {
      hasInitialized.current = true;
      // Auto-fetch location when screen loads
      handleGetCurrentLocation();
    }
  }, []);

  const handleGetCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Please enable location permissions in your device settings.',
          [{ text: 'OK' }]
        );
        setIsLoadingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const fullAddress = [
        address?.name,
        address?.street,
        address?.city,
        address?.region,
        address?.postalCode,
      ].filter(Boolean).join(', ');

      setLocationData({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        street: address?.street || '',
        city: address?.city || '',
        region: address?.region || '',
        postalCode: address?.postalCode || '',
        name: address?.name || '',
        fullAddress,
      });
    } catch (error) {
      console.error('Location error:', error);
      // Set a default location for demo purposes
      setLocationData({
        latitude: 13.0827,
        longitude: 80.2707,
        street: '7th Ave',
        city: 'Chennai',
        region: 'Tamil Nadu',
        postalCode: '600028',
        name: '7th Ave',
        fullAddress: '7th Ave, Grand Northern Trunk Rd, Thirumangalam, Chennai-28',
      });
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const getShortAddress = () => {
    if (isLoadingLocation) return 'Getting location...';
    if (!locationData) return 'Select Location';
    return locationData.name || locationData.street || 'Selected Location';
  };

  const getFullAddress = () => {
    if (isLoadingLocation) return 'Please wait while we detect your location';
    if (!locationData) return 'Tap GPS button to get your location';
    return locationData.fullAddress || 'Location detected';
  };

  const updateLocationFromPan = async (dx: number, dy: number) => {
    if (!locationData || isUpdatingLocation) return;
    
    setIsUpdatingLocation(true);
    // Simulate location change based on pan
    // In a real app, you'd convert screen coordinates to lat/lng
    const latDelta = dy * 0.00001; // Approximate conversion
    const lngDelta = dx * 0.00001;
    
    const newLat = locationData.latitude - latDelta;
    const newLng = locationData.longitude + lngDelta;
    
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude: newLat,
        longitude: newLng,
      });

      const fullAddress = [
        address?.name,
        address?.street,
        address?.city,
        address?.region,
        address?.postalCode,
      ].filter(Boolean).join(', ');

      setLocationData({
        latitude: newLat,
        longitude: newLng,
        street: address?.street || '',
        city: address?.city || '',
        region: address?.region || '',
        postalCode: address?.postalCode || '',
        name: address?.name || '',
        fullAddress,
      });
    } catch (error) {
      console.error('Location update error:', error);
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const panResponderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        setMapOffset({
          x: gestureState.dx,
          y: gestureState.dy,
        });
      },
      onPanResponderRelease: async (evt, gestureState) => {
        // Update location based on pan offset
        if (Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10) {
          await updateLocationFromPan(gestureState.dx, gestureState.dy);
        }
        setMapOffset({ x: 0, y: 0 });
      },
    })
  ).current;

  const handleConfirm = () => {
    if (!locationData) {
      Alert.alert('Location Required', 'Please wait for location to be detected.');
      return;
    }
    
    if (fromCurrentLocation) {
      // Redirect directly to home page with updated location
      router.push('/(customer)');
    } else {
      // After saving, redirect back to enter your area page
      Alert.alert('Success', 'Address saved successfully!', [
        { text: 'OK', onPress: () => router.push('/(customer)/address/search') }
      ]);
    }
  };

  const getTagIcon = (tag: string) => {
    switch (tag) {
      case 'Home': return '🏠';
      case 'Work': return '💼';
      case 'Friends and Family': return '👥';
      case 'Others': return '📍';
      default: return '📍';
    }
  };

  return (
    <View style={styles.container}>
      {/* Dark Map Background */}
      <View style={styles.mapContainer} {...panResponderRef.panHandlers}>
        {/* Map Grid Pattern - Dark Theme */}
        <View style={[styles.mapBackground, { transform: [{ translateX: mapOffset.x }, { translateY: mapOffset.y }] }]}>
          {/* Horizontal streets */}
          <View style={[styles.street, { top: 80, left: 0, right: 0, height: 1 }]} />
          <View style={[styles.street, { top: 160, left: 0, right: 0, height: 1 }]} />
          <View style={[styles.street, { top: 240, left: 0, right: 0, height: 1 }]} />
          <View style={[styles.street, { top: 320, left: 0, right: 0, height: 1 }]} />
          
          {/* Vertical streets */}
          <View style={[styles.street, { left: 60, top: 0, bottom: 0, width: 1 }]} />
          <View style={[styles.street, { left: 140, top: 0, bottom: 0, width: 1 }]} />
          <View style={[styles.street, { left: 220, top: 0, bottom: 0, width: 1 }]} />
          <View style={[styles.street, { left: 300, top: 0, bottom: 0, width: 1 }]} />
          
          {/* Main diagonal road */}
          <View style={styles.mainRoad} />
          
          {/* Place labels */}
          <Text style={[styles.placeLabel, { top: 100, left: 10 }]}>SB Hall</Text>
          <Text style={[styles.placeLabel, { top: 140, left: 15 }]}>Col &{'\n'}Lege</Text>
          <Text style={[styles.placeLabel, { top: 180, right: 40 }]}>Kay-Em Royal Mahal</Text>
          <Text style={[styles.placeLabel, { top: 280, left: 10 }]}>Thavusukutti Biryani{'\n'}Biryani Shop</Text>
          <Text style={[styles.placeLabel, { top: 360, left: 80 }]}>Anna St</Text>
          <Text style={[styles.placeLabel, { top: 230, left: 50 }]}>7th Ave</Text>
          <Text style={[styles.streetLabel, { top: 120, left: 200 }]}>Park Rd</Text>
          <Text style={[styles.streetLabel, { top: 200, left: 250 }]}>Appar St</Text>
          <Text style={[styles.streetLabel, { top: 300, left: 180 }]}>10th St</Text>
          <Text style={[styles.streetLabel, { top: 340, left: 220 }]}>15th Main Rd</Text>
          <View style={[styles.rotatedLabelContainer, { top: 150, right: 50 }]}>
            <Text style={styles.streetLabel}>Grand Northern Trunk Rd</Text>
          </View>
          
          {/* Points of Interest Icons */}
          <View style={[styles.poiIcon, { top: 90, left: 20 }]}>
            <Text style={styles.poiEmoji}>🏠</Text>
          </View>
          <View style={[styles.poiIcon, { top: 270, left: 15 }]}>
            <Text style={styles.poiEmoji}>🍽️</Text>
          </View>
          <View style={[styles.poiIcon, { top: 100, right: 30 }]}>
            <Text style={styles.poiText}>H</Text>
          </View>
          <View style={[styles.poiIcon, { top: 350, right: 20 }]}>
            <Text style={styles.poiEmoji}>💼</Text>
          </View>
        </View>

        {/* Top Bar Container */}
        <View style={[styles.topBarContainer, { top: insets.top + 10 }]}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Feather name="search" size={18} color="#64748B" />
            <TextInput 
              placeholder="Try Jp nagar, siri gardeniam, etc." 
              style={styles.searchInput}
              placeholderTextColor="#94A3B8"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {/* GPS Button */}
          <TouchableOpacity 
            style={styles.gpsButton}
            onPress={handleGetCurrentLocation}
            disabled={isLoadingLocation}
          >
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color={COLORS.text} />
            ) : (
              <Ionicons name="locate" size={22} color={COLORS.text} />
            )}
         </TouchableOpacity>
        </View>

        {/* Location Pin */}
        <View style={styles.pinContainer}>
          <View style={styles.pinOuter}>
            <View style={styles.pinInner} />
          </View>
          <View style={styles.pinShadow} />
        </View>

        {/* Route indicator */}
        <View style={styles.routeIndicator}>
          <Text style={styles.routeText}>112</Text>
        </View>
      </View>

      {/* Bottom Sheet */}
      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 16 }]}>
        <ScrollView 
          style={styles.bottomSheetScrollView}
          contentContainerStyle={styles.bottomSheetContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Location Info */}
          <View style={styles.locationInfo}>
            <View style={styles.locationIconContainer}>
              <Ionicons name="location-sharp" size={24} color="#102841" />
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationTitle}>{getShortAddress()}</Text>
              <Text style={styles.locationAddress} numberOfLines={2}>
                {getFullAddress()}
                 </Text>
             </View>
         </View>

          {/* Information Box - Hide for current location flow */}
          {!fromCurrentLocation && (
         <View style={styles.infoBox}>
            <Text style={styles.infoText}>
                The more accurate your address, the quicker we can reach you!
            </Text>
         </View>
          )}

          {/* Form Inputs - Hide for current location flow */}
          {!fromCurrentLocation && (
            <>
         <View style={styles.form}>
            <TextInput 
                placeholder="House / Flat / Block number."
                style={styles.input}
                placeholderTextColor="#94A3B8"
                  value={houseNumber}
                  onChangeText={setHouseNumber}
            />
            <TextInput 
                  placeholder="Apartment / Road / Area (Recommended)"
                style={styles.input}
                placeholderTextColor="#94A3B8"
                  value={apartmentRoad}
                  onChangeText={setApartmentRoad}
            />
         </View>

              {/* Save As Section */}
         <Text style={styles.saveAsLabel}>Save As</Text>
              <View style={saveAs === 'Others' ? styles.tagsContainerWithOthers : styles.tagsContainer}>
            {['Home', 'Work', 'Friends and Family', 'Others'].map((tag) => (
                <TouchableOpacity 
                    key={tag} 
                    style={[styles.tag, saveAs === tag && styles.activeTag]}
                    onPress={() => setSaveAs(tag)}
                >
                    <Text style={styles.tagIcon}>{getTagIcon(tag)}</Text>
                   <Text style={[styles.tagText, saveAs === tag && styles.activeTagText]}>
                       {tag}
                   </Text>
                </TouchableOpacity>
            ))}
         </View>

              {/* Save As Name Input - Only show for Others */}
              {saveAs === 'Others' && (
                <View style={styles.saveAsNameSection}>
                  <Text style={styles.saveAsNameLabel}>Save As</Text>
                  <TextInput
                    placeholder="Enter name"
                    style={styles.input}
                    placeholderTextColor="#94A3B8"
                    value={saveAsName}
                    onChangeText={setSaveAsName}
                  />
                </View>
              )}

              {/* Receiver's Phone Number Section - Show for Work, Friends and Family, or Others */}
              {(saveAs === 'Work' || saveAs === 'Friends and Family' || saveAs === 'Others') && (
                <View style={saveAs === 'Others' ? styles.receiverPhoneSectionOthers : styles.receiverPhoneSection}>
                  <Text style={styles.receiverPhoneLabel}>Receiver's phone number(optional)</Text>
                  <Text style={styles.receiverPhoneHint}>
                    we will call on 9342981843, if you are unavailable on this number
                  </Text>
                  <TextInput
                    placeholder="Enter receiver's phone number"
                    style={styles.input}
                    placeholderTextColor="#94A3B8"
                    value={receiverPhone}
                    onChangeText={setReceiverPhone}
                    keyboardType="phone-pad"
            />
         </View>
              )}
            </>
          )}

          {/* Confirm/Proceed Button */}
          <TouchableOpacity 
            style={styles.confirmButton}
            onPress={handleConfirm}
            disabled={isUpdatingLocation}
          >
            <Text style={styles.confirmButtonText}>
              {fromCurrentLocation ? 'Confirm/Proceed' : 'Save Address'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapBackground: {
    flex: 1,
    backgroundColor: '#1E293B',
      position: 'relative',
  },
  street: {
    position: 'absolute',
    backgroundColor: '#334155',
  },
  mainRoad: {
    position: 'absolute',
    top: 150,
    right: -50,
    width: SCREEN_WIDTH,
    height: 6,
    backgroundColor: '#475569',
    transform: [{ rotate: '-35deg' }],
  },
  placeLabel: {
    position: 'absolute',
    color: '#94A3B8',
    fontSize: 10,
  },
  streetLabel: {
    color: '#64748B',
    fontSize: 9,
  },
  rotatedLabelContainer: {
    position: 'absolute',
    transform: [{ rotate: '-30deg' }],
  },
  poiIcon: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  poiEmoji: {
    fontSize: 18,
  },
  poiText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  topBarContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    marginRight: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  gpsButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
      backgroundColor: 'white',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
      elevation: 5,
  },
  pinContainer: {
    position: 'absolute',
    top: 200,
    left: 100,
    alignItems: 'center',
  },
  pinOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  pinInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  pinShadow: {
    width: 20,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    marginTop: 4,
  },
  routeIndicator: {
    position: 'absolute',
    top: 280,
    left: 130,
    backgroundColor: '#475569',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  routeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F0F9FF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    maxHeight: '55%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomSheetScrollView: {
    flex: 1,
  },
  bottomSheetContentContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  locationInfo: {
      flexDirection: 'row',
      marginBottom: 20,
    alignItems: 'flex-start',
  },
  locationIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 20,
      fontWeight: 'bold',
    color: '#102841',
      marginBottom: 4,
  },
  locationAddress: {
      fontSize: 14,
    color: '#102841',
      lineHeight: 20,
  },
  infoBox: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 16,
    paddingVertical: 12,
      borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
      color: '#0C4A6E',
    lineHeight: 20,
  },
  form: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#102841',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  saveAsLabel: {
      fontSize: 16,
      fontWeight: 'bold',
    color: '#102841',
      marginBottom: 12,
  },
  tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    marginBottom: 24,
    gap: 8,
  },
  tagsContainerWithOthers: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  tag: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
      borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
    marginBottom: 8,
  },
  activeTag: {
    backgroundColor: '#102841',
    borderColor: '#102841',
  },
  tagIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  tagText: {
      fontSize: 14,
    color: '#102841',
      fontWeight: '500',
  },
  activeTagText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  saveAsNameSection: {
    marginBottom: 12,
  },
  saveAsNameLabel: {
    fontSize: 15,
    color: '#102841',
    marginBottom: 8,
    fontWeight: '500',
  },
  receiverPhoneSection: {
    marginBottom: 24,
  },
  receiverPhoneSectionOthers: {
    marginBottom: 12,
  },
  receiverPhoneLabel: {
    fontSize: 15,
    color: '#102841',
    marginBottom: 6,
    fontWeight: '500',
  },
  receiverPhoneHint: {
    fontSize: 12,
    color: '#102841',
    marginBottom: 12,
    lineHeight: 16,
  },
  confirmButton: {
    backgroundColor: '#102841',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 0,
    marginTop: 8,
  },
  confirmButtonText: {
    color: 'white',
      fontSize: 16,
    fontWeight: '600',
  },
});
