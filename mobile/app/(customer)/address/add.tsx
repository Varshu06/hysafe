import { Feather, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Region } from 'react-native-maps';
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

const DARK_MAP_STYLE = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#746855" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#d59563" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#d59563" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#263c3f" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#6b9a76" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#38414e" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#212a37" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9ca5b3" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#746855" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#1f2835" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#f3d19c" }]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [{ "color": "#2f3948" }]
  },
  {
    "featureType": "transit.station",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#d59563" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#17263c" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#515c6d" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#17263c" }]
  }
];

export default function AddAddressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);

  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 13.0827,
    longitude: 80.2707,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  // Initialize with params if coming from "Use my current location"
  useEffect(() => {
    if (params.latitude && params.longitude) {
      const lat = parseFloat(params.latitude as string);
      const lng = parseFloat(params.longitude as string);

      setRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });

      const fullAddress = [
        params.name,
        params.street,
        params.city,
        params.region,
        params.postalCode,
      ].filter(Boolean).join(', ');

      setLocationData({
        latitude: lat,
        longitude: lng,
        street: params.street as string || '',
        city: params.city as string || '',
        region: params.region as string || '',
        postalCode: params.postalCode as string || '',
        name: params.name as string || '',
        fullAddress,
      });
    } else {
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

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };

      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);

      // Reverse geocode will happen via onRegionChangeComplete
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get your location.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const onRegionChangeComplete = async (newRegion: Region) => {
    // Don't update if moving very small distance to avoid spamming
    // But for this demo we want responsive updates
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude: newRegion.latitude,
        longitude: newRegion.longitude,
      });

      if (address) {
        const fullAddress = [
          address.name,
          address.street,
          address.city,
          address.region,
          address.postalCode,
        ].filter(Boolean).join(', ');

        setLocationData({
          latitude: newRegion.latitude,
          longitude: newRegion.longitude,
          street: address.street || '',
          city: address.city || '',
          region: address.region || '',
          postalCode: address.postalCode || '',
          name: address.name || address.street || 'Selected Location',
          fullAddress,
        });
      }
    } catch (error) {
      // Ignore geocoding errors during rapid movement
    }
  };

  const getShortAddress = () => {
    if (isLoadingLocation) return 'Getting location...';
    if (!locationData) return 'Select Location';
    return locationData.name || locationData.street || 'Selected Location';
  };

  const getFullAddress = () => {
    if (isLoadingLocation) return 'Please wait while we detect your location';
    if (!locationData) return 'Move map to select location';
    return locationData.fullAddress || 'Location detected';
  };

  const handleConfirm = () => {
    if (!locationData) {
      Alert.alert('Location Required', 'Please wait for location to be detected.');
      return;
    }

    Alert.alert('Success', 'Address saved successfully!', [
      { text: 'OK', onPress: () => router.push('/(customer)') }
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          customMapStyle={DARK_MAP_STYLE}
          onRegionChangeComplete={onRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
        />

        {/* Search Bar */}
        <View style={[styles.searchContainer, { top: insets.top + 10 }]}>
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
          style={[styles.gpsButton, { top: insets.top + 10 }]}
          onPress={handleGetCurrentLocation}
          disabled={isLoadingLocation}
        >
          {isLoadingLocation ? (
            <ActivityIndicator size="small" color="#8B5CF6" />
          ) : (
            <Ionicons name="locate" size={22} color="#8B5CF6" />
          )}
        </TouchableOpacity>

        {/* Center Pin (Fixed) */}
        <View style={styles.centerPinContainer} pointerEvents="none">
          <View style={styles.pinOuter}>
            <View style={styles.pinInner} />
          </View>
          <View style={styles.pinShadow} />
        </View>
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        {/* Location Info */}
        <View style={styles.locationInfo}>
          <View style={styles.locationIconContainer}>
            <Ionicons name="location" size={24} color="#3B82F6" />
          </View>
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationTitle}>{getShortAddress()}</Text>
            <Text style={styles.locationAddress} numberOfLines={2}>
              {getFullAddress()}
            </Text>
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmButton, { marginBottom: insets.bottom > 0 ? insets.bottom : 16 }]}
          onPress={handleConfirm}
        >
          <Text style={styles.confirmButtonText}>Confirm/Proceed</Text>
        </TouchableOpacity>
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
  map: {
    width: '100%',
    height: '100%',
  },
  searchContainer: {
    position: 'absolute',
    left: 16,
    right: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  gpsButton: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 8,
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
  centerPinContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    // Adjust for pin height to point exactly at center
    marginTop: -35,
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
  bottomSheet: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  locationInfo: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  locationIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  confirmButton: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
