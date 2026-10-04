import { Feather, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addressStorage } from '../../../src/utils/addressStorage';
import { COLORS, FACTORY_LOCATION, GOOGLE_MAPS_API_KEY } from '../../../src/utils/constants';
import { ensureForegroundLocationPermission, getCurrentPositionWithTimeout } from '../../../src/utils/location';

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
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState('');
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [houseNumber, setHouseNumber] = useState('');
  const [apartmentRoad, setApartmentRoad] = useState('');
  const [saveAs, setSaveAs] = useState('Home');
  const [saveAsName, setSaveAsName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const hasInitialized = useRef(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const reverseGeocodeRequest = useRef(0);
  
  const fromCurrentLocation = params.fromCurrentLocation === 'true';

  // Initialize with params if coming from "Use my current location"
  useEffect(() => {
    if (hasInitialized.current) return;
    
    if (params.latitude && params.longitude) {
      hasInitialized.current = true;
      const latitude = Number(params.latitude);
      const longitude = Number(params.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        setLocationError('The selected coordinates are invalid. Please choose a location again.');
        return;
      }
      const fullAddress = (params.fullAddress as string) || [
        params.name,
        params.street,
        params.city,
        params.region,
        params.postalCode,
      ].filter(Boolean).join(', ');
      
      const newLocationData = {
        latitude,
        longitude,
        street: params.street as string || '',
        city: params.city as string || '',
        region: params.region as string || '',
        postalCode: params.postalCode as string || '',
        name: params.name as string || '',
        fullAddress,
      };
      
      setLocationData(newLocationData);
      setLocationConfirmed(false);
      if (params.type) setSaveAs(String(params.type));
      
      // Update map location
      updateMapLocation(newLocationData.latitude, newLocationData.longitude);
    } else {
      hasInitialized.current = true;
      if (params.edit === 'true') {
        setLocationError('This saved address has no stored coordinates. Select its location on the map before saving the edit.');
      } else {
        handleGetCurrentLocation();
      }
    }
  }, []);

  const handleGetCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      if (!(await ensureForegroundLocationPermission())) {
        setLocationError('Location permission is denied. You can still choose a location on the map or search for a place.');
        setIsLoadingLocation(false);
        return;
      }

      const location = await getCurrentPositionWithTimeout();

      const selected = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        street: '', city: '', region: '', postalCode: '', name: '', fullAddress: '',
      };
      setLocationData(selected);
      setLocationConfirmed(false);
      setLocationError('');
      reverseGeocodeRequest.current += 1;
      setIsUpdatingLocation(false);
      const locationRequest = reverseGeocodeRequest.current;
      updateMapLocation(selected.latitude, selected.longitude);

      try {
        const [address] = await Location.reverseGeocodeAsync(selected);

      const fullAddress = [
        address?.name,
        address?.street,
        address?.city,
        address?.region,
        address?.postalCode,
      ].filter(Boolean).join(', ');

      const newLocationData = {
        latitude: selected.latitude,
        longitude: selected.longitude,
        street: address?.street || '',
        city: address?.city || '',
        region: address?.region || '',
        postalCode: address?.postalCode || '',
        name: address?.name || '',
        fullAddress,
      };
      
      if (locationRequest === reverseGeocodeRequest.current) {
        setLocationData(newLocationData);
        setLocationError(fullAddress ? '' : 'We could not resolve this location to an address. Enter the delivery address below before confirming.');
      }
      } catch {
        if (locationRequest === reverseGeocodeRequest.current) setLocationError('Location found, but its address could not be resolved. Enter the delivery address below before confirming.');
      }
    } catch (error: any) {
      // Location unavailable - this is expected if location services are disabled
      // Only log if it's not a permission or availability issue
      if (!error.message?.includes('location') && !error.message?.includes('permission')) {
        console.warn('Location error:', error);
      }
      // Show user-friendly error message
      setLocationError('Unable to get your current location. Check that location services are enabled, or choose a place manually.');
      // Don't set default location - let user manually select
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const getShortAddress = () => {
    if (isLoadingLocation) return 'Getting location...';
    if (!locationData) return 'Select Location';
    return locationData.name || locationData.street || (locationData.fullAddress ? 'Selected Location' : 'Location selected');
  };

  const getFullAddress = () => {
    if (isLoadingLocation) return 'Please wait while we detect your location';
    if (!locationData) return 'Use current location or select a location on the map';
    return locationData.fullAddress || `${locationData.latitude.toFixed(5)}, ${locationData.longitude.toFixed(5)}`;
  };

  const updateMapLocation = (lat: number, lng: number) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (window.map && window.marker) {
          const newPosition = { lat: ${lat}, lng: ${lng} };
          window.marker.setPosition(newPosition);
          window.map.setCenter(newPosition);
          window.map.setZoom(15);
        }
      `);
    }
  };

  const handleMapRegionChangeComplete = async (region: { latitude: number; longitude: number }) => {
    if (!Number.isFinite(region.latitude) || !Number.isFinite(region.longitude) || Math.abs(region.latitude) > 90 || Math.abs(region.longitude) > 180) return;
    const request = ++reverseGeocodeRequest.current;
    setLocationConfirmed(false);
    setLocationData({ latitude: region.latitude, longitude: region.longitude, street: '', city: '', region: '', postalCode: '', name: '', fullAddress: '' });
    setLocationError('');
    
    setIsUpdatingLocation(true);
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude: region.latitude,
        longitude: region.longitude,
      });

      const fullAddress = [
        address?.name,
        address?.street,
        address?.city,
        address?.region,
        address?.postalCode,
      ].filter(Boolean).join(', ');

      if (request !== reverseGeocodeRequest.current) return;
      setLocationData({
        latitude: region.latitude,
        longitude: region.longitude,
        street: address?.street || '',
        city: address?.city || '',
        region: address?.region || '',
        postalCode: address?.postalCode || '',
        name: address?.name || '',
        fullAddress,
      });
      setLocationError(fullAddress ? '' : 'Address not available for this point. Enter the delivery address below before confirming.');
    } catch (error) {
      if (request !== reverseGeocodeRequest.current) return;
      console.warn('Reverse geocoding failed:', error);
      setLocationError('Address lookup failed. You can enter the delivery address below and confirm this map location.');
    } finally {
      if (request === reverseGeocodeRequest.current) setIsUpdatingLocation(false);
    }
  };

  const handleSearchLocation = async () => {
    const query = searchText.trim();
    if (query.length < 3) return;
    setIsLoadingLocation(true);
    setLocationError('');
    try {
      const [result] = await Location.geocodeAsync(query);
      if (!result || !Number.isFinite(result.latitude) || !Number.isFinite(result.longitude)) {
        setLocationError('No matching location was found. Try a more specific place or address.');
        return;
      }
      const selected: LocationData = { latitude: result.latitude, longitude: result.longitude, street: '', city: '', region: '', postalCode: '', name: '', fullAddress: '' };
      setLocationData(selected);
      setLocationConfirmed(false);
      reverseGeocodeRequest.current += 1;
      const locationRequest = reverseGeocodeRequest.current;
      setIsUpdatingLocation(false);
      updateMapLocation(selected.latitude, selected.longitude);
      try {
        const [address] = await Location.reverseGeocodeAsync(selected);
        const fullAddress = [address?.name, address?.street, address?.city, address?.region, address?.postalCode].filter(Boolean).join(', ');
        if (locationRequest !== reverseGeocodeRequest.current) return;
        if (fullAddress) {
          setLocationData({ ...selected, street: address?.street || '', city: address?.city || '', region: address?.region || '', postalCode: address?.postalCode || '', name: address?.name || '', fullAddress });
        } else {
          setLocationError('Location found, but no readable address was returned. Enter the address details below.');
        }
      } catch {
        if (locationRequest === reverseGeocodeRequest.current) setLocationError('Location found, but address lookup failed. Enter the address details below.');
      }
    } catch (error) {
      console.warn('Location search failed:', error);
      setLocationError('Location search failed. Check your network connection and try again.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const generateMapHTML = (initialLat: number, initialLng: number) => {
    const apiKey = GOOGLE_MAPS_API_KEY;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body, html { margin: 0; padding: 0; height: 100%; width: 100%; }
            #map { height: 100%; width: 100%; }
            .error-message { display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); z-index: 1000; text-align: center; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <div id="error" class="error-message">
            <div style="font-weight: bold; margin-bottom: 10px;">⚠️ Map Loading Error</div>
            <div style="font-size: 14px; color: #666;">Unable to load Google Maps. Please check your API key configuration.</div>
          </div>
          <script>
            let map, marker;
            let mapLoaded = false;
            
            function initMap() {
              try {
                const initialPosition = { lat: ${initialLat}, lng: ${initialLng} };
                
                map = new google.maps.Map(document.getElementById('map'), {
                  center: initialPosition,
                  zoom: 16,
                  mapTypeControl: true,
                  mapTypeControlOptions: {
                    style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
                    position: google.maps.ControlPosition.TOP_RIGHT,
                    mapTypeIds: [
                      google.maps.MapTypeId.ROADMAP,
                      google.maps.MapTypeId.SATELLITE
                    ]
                  },
                  streetViewControl: false,
                  fullscreenControl: true,
                  fullscreenControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_TOP
                  },
                  zoomControl: true,
                  zoomControlOptions: {
                    position: google.maps.ControlPosition.RIGHT_CENTER
                  },
                  disableDefaultUI: false,
                  clickableIcons: true,
                  gestureHandling: 'greedy',
                  // Use default Google Maps styling for clear, readable map
                  styles: []
                });
                window.map = map;
                
                // Create custom marker with pin style
                marker = new google.maps.Marker({
                  position: initialPosition,
                  map: map,
                  draggable: true,
                  animation: google.maps.Animation.DROP,
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(\`
                      <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                            <feOffset dx="0" dy="2" result="offsetblur"/>
                            <feComponentTransfer>
                              <feFuncA type="linear" slope="0.3"/>
                            </feComponentTransfer>
                            <feMerge>
                              <feMergeNode/>
                              <feMergeNode in="SourceGraphic"/>
                            </feMerge>
                          </filter>
                        </defs>
                        <path d="M24 0C10.745 0 0 10.745 0 24c0 24 24 24 24 24s24 0 24-24C48 10.745 37.255 0 24 0z" 
                              fill="${COLORS.primary}" 
                              filter="url(#shadow)"/>
                        <circle cx="24" cy="24" r="10" fill="#FFFFFF"/>
                        <circle cx="24" cy="24" r="6" fill="${COLORS.primary}"/>
                      </svg>
                    \`),
                    scaledSize: new google.maps.Size(48, 48),
                    anchor: new google.maps.Point(24, 48)
                  },
                  title: 'Drag to set your location',
                  zIndex: 1000
                });
                window.marker = marker;
                
                let userSelectedLocation = false;
                map.addListener('dragstart', () => {
                  userSelectedLocation = true;
                });
                
                // Handle map click - move marker to clicked location
                map.addListener('click', (e) => {
                  userSelectedLocation = true;
                  const lat = e.latLng.lat();
                  const lng = e.latLng.lng();
                  marker.setPosition({ lat, lng });
                  map.panTo({ lat, lng });
                  
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'locationChange',
                    latitude: lat,
                    longitude: lng
                  }));
                });
                
                // Handle marker drag
                marker.addListener('dragstart', () => {
                  userSelectedLocation = true;
                  marker.setAnimation(google.maps.Animation.BOUNCE);
                });
                
                marker.addListener('dragend', (e) => {
                  marker.setAnimation(null);
                  const lat = e.latLng.lat();
                  const lng = e.latLng.lng();
                  map.panTo({ lat, lng });
                  
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'locationChange',
                    latitude: lat,
                    longitude: lng
                  }));
                });
                
                // Report the settled center after a user pans or zooms the map.
                map.addListener('idle', () => {
                  const center = map.getCenter();
                  if (center && userSelectedLocation) {
                    const lat = center.lat();
                    const lng = center.lng();
                    marker.setPosition({ lat, lng });
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'locationChange',
                      latitude: lat,
                      longitude: lng
                    }));
                  }
                });
                
                mapLoaded = true;
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
              } catch (error) {
                console.error('Map initialization error:', error);
                document.getElementById('error').style.display = 'block';
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'error',
                  message: 'Failed to initialize map: ' + error.message
                }));
              }
            }
            
            function handleMapError() {
              document.getElementById('error').style.display = 'block';
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                message: 'Failed to load Google Maps API'
              }));
            }
            window.gm_authFailure = handleMapError;
            
            // Only Maps JavaScript API is required to render this selectable map.
            const script = document.createElement('script');
            script.src = 'https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=initMap';
            script.async = true;
            script.defer = true;
            script.onerror = handleMapError;
            
            // Set timeout to detect if map doesn't load
            setTimeout(() => {
              if (!mapLoaded) {
                handleMapError();
              }
            }, 10000); // 10 second timeout
            
            document.head.appendChild(script);
          </script>
        </body>
      </html>
    `;
  };

  const handleConfirm = async () => {
    const typedAddress = [houseNumber, apartmentRoad, locationData?.fullAddress]
      .filter((value, index, values) => Boolean(value) && values.indexOf(value) === index)
      .join(', ');
    if (!locationData || !Number.isFinite(locationData.latitude) || !Number.isFinite(locationData.longitude) || Math.abs(locationData.latitude) > 90 || Math.abs(locationData.longitude) > 180 || (locationData.latitude === 0 && locationData.longitude === 0)) {
      Alert.alert(t('locationRequired'), t('chooseValidLocation'));
      return;
    }
    if (!typedAddress.trim()) {
      Alert.alert(t('addressRequired'), t('enterDeliveryAddressPrompt'));
      return;
    }
    if (!locationConfirmed) {
      setLocationConfirmed(true);
      return;
    }
    
    try {
      // Generate a unique ID for the address
      const addressId = params.edit === 'true' && params.addressId
        ? String(params.addressId)
        : `addr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Prepare address data
      const addressToSave = {
        id: addressId,
        type: saveAsName || saveAs || 'Home',
        address: typedAddress.length > 30 ? typedAddress.substring(0, 30) + '...' : typedAddress,
        fullAddress: typedAddress,
        location: {
          lat: locationData.latitude,
          lng: locationData.longitude,
        },
      };

      // Save address to storage
      await addressStorage.addAddress(addressToSave);
      // Set as selected address
      await addressStorage.setSelectedAddressId(addressId);

      if (fromCurrentLocation || params.edit === 'true') {
        router.replace('/(customer)/address/search');
      } else {
        Alert.alert(t('Success'), t('addressSavedSuccess'), [
          { text: t('ok'), onPress: () => router.replace('/(customer)/address/search') }
        ]);
      }
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert(t('Error'), t('failedToSaveAddress'));
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

  const mapHtml = useMemo(() => generateMapHTML(FACTORY_LOCATION.lat, FACTORY_LOCATION.lng), []);

  return (
    <View style={styles.container}>
      {/* WebView is native-only; web uses the address form below. */}
      {Platform.OS === 'web' ? (
        <View style={styles.webAddressPanel}>
          <Ionicons name="location-outline" size={30} color={COLORS.primary} />
          <Text style={styles.webAddressTitle}>Map unavailable on web</Text>
          <Text style={styles.webAddressHint}>Open HySafe on a supported mobile device to choose a delivery location on the interactive map.</Text>
        </View>
      ) : !GOOGLE_MAPS_API_KEY ? (
        <View style={styles.webAddressPanel}>
          <Ionicons name="map-outline" size={30} color={COLORS.primary} />
          <Text style={styles.webAddressTitle}>Map configuration required</Text>
          <Text style={styles.webAddressHint}>Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to enable the interactive map. You can still use current location or select a geocoded result.</Text>
        </View>
      ) : <WebView
        ref={webViewRef}
        style={styles.mapContainer}
        source={{ html: mapHtml }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'mapReady') {
              if (locationData) updateMapLocation(locationData.latitude, locationData.longitude);
            } else if (data.type === 'locationChange') {
              handleMapRegionChangeComplete({
                latitude: data.latitude,
                longitude: data.longitude,
              });
            } else if (data.type === 'error') {
              console.error('Map error:', data.message);
              setLocationError('Google Maps could not load. Check the Maps JavaScript API key, its restrictions, and your network connection.');
              Alert.alert(
                t('mapLoadingError'),
                data.message || t('mapLoadingErrorMessage'),
                [{ text: t('ok') }]
              );
            }
          } catch (error) {
            console.error('Error parsing map message:', error);
          }
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          setLocationError('Unable to load the interactive map. Check your network connection and Google Maps API configuration.');
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />}

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
            onChangeText={(value) => {
              setSearchText(value);
              setLocationConfirmed(false);
              setLocationError('');
            }}
            onSubmitEditing={handleSearchLocation}
            returnKeyType="search"
          />
        </View>

          {locationError ? <Text style={styles.locationError}>{locationError}</Text> : null}
          {locationData ? <Text style={styles.coordinatesText}>Selected coordinates: {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}</Text> : null}

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
      {(!fromCurrentLocation || !locationData?.fullAddress) && (
         <View style={styles.infoBox}>
            <Text style={styles.infoText}>
                The more accurate your address, the quicker we can reach you!
            </Text>
         </View>
          )}

          {/* Form Inputs - Hide for current location flow */}
          {(!fromCurrentLocation || !locationData?.fullAddress) && (
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
            disabled={isUpdatingLocation || isLoadingLocation}
          >
            <Text style={styles.confirmButtonText}>
              {!locationConfirmed ? 'Confirm Location' : fromCurrentLocation ? 'Continue' : 'Save Address'}
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
    width: '100%',
    height: '100%',
  },
  webAddressPanel: {
    flex: 1,
    minHeight: 260,
    backgroundColor: '#E8F4FC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  webAddressTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginTop: 10 },
  webAddressHint: { fontSize: 14, color: COLORS.textLight, textAlign: 'center', marginTop: 8 },
  locationError: { color: '#B42318', fontSize: 13, marginHorizontal: 16, marginTop: 8 },
  coordinatesText: { color: COLORS.textLight, fontSize: 11, marginHorizontal: 16, marginTop: 4 },
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
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
