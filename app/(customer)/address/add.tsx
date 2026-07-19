import { Feather, Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { addressStorage } from "../../../src/utils/addressStorage";
import { COLORS, GOOGLE_MAPS_API_KEY } from "../../../src/utils/constants";

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
  const [searchText, setSearchText] = useState("");
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [houseNumber, setHouseNumber] = useState("");
  const [apartmentRoad, setApartmentRoad] = useState("");
  const [saveAs, setSaveAs] = useState("Home");
  const [saveAsName, setSaveAsName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const hasInitialized = useRef(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const fromCurrentLocation = params.fromCurrentLocation === "true";
  const searchThisAreaText = t("searchThisArea");
  const tapOrDragPinText = t("tapOrDragPin");

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
      ]
        .filter(Boolean)
        .join(", ");

      const newLocationData = {
        latitude: parseFloat(params.latitude as string),
        longitude: parseFloat(params.longitude as string),
        street: (params.street as string) || "",
        city: (params.city as string) || "",
        region: (params.region as string) || "",
        postalCode: (params.postalCode as string) || "",
        name: (params.name as string) || "",
        fullAddress,
      };

      setLocationData(newLocationData);

      // Update map location
      updateMapLocation(newLocationData.latitude, newLocationData.longitude);
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
      if (status !== "granted") {
        Alert.alert(t("permissionDenied"), t("enableLocationPermissions"), [
          { text: t("ok") },
        ]);
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
      ]
        .filter(Boolean)
        .join(", ");

      const newLocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        street: address?.street || "",
        city: address?.city || "",
        region: address?.region || "",
        postalCode: address?.postalCode || "",
        name: address?.name || "",
        fullAddress,
      };

      setLocationData(newLocationData);

      // Update map location
      updateMapLocation(newLocationData.latitude, newLocationData.longitude);
    } catch (error: any) {
      // Location unavailable - this is expected if location services are disabled
      // Only log if it's not a permission or availability issue
      if (
        !error.message?.includes("location") &&
        !error.message?.includes("permission")
      ) {
        console.warn("Location error:", error);
      }
      // Show user-friendly error message
      Alert.alert(t("locationUnavailable"), t("unableToGetCurrentLocation"), [
        { text: t("ok") },
      ]);
      // Don't set default location - let user manually select
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const getShortAddress = () => {
    if (isLoadingLocation) return t("gettingLocation");
    if (!locationData) return t("selectLocation");
    return locationData.name || locationData.street || t("selectedLocation");
  };

  const getFullAddress = () => {
    if (isLoadingLocation) return t("pleaseWaitWhileDetectingLocation");
    if (!locationData) return t("tapGpsToGetLocation");
    return locationData.fullAddress || t("locationDetected");
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

  const handleMapRegionChangeComplete = async (region: {
    latitude: number;
    longitude: number;
  }) => {
    if (isUpdatingLocation) return;

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
      ]
        .filter(Boolean)
        .join(", ");

      setLocationData({
        latitude: region.latitude,
        longitude: region.longitude,
        street: address?.street || "",
        city: address?.city || "",
        region: address?.region || "",
        postalCode: address?.postalCode || "",
        name: address?.name || "",
        fullAddress,
      });
    } catch (error) {
      console.error("Location update error:", error);
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  const generateMapHTML = (initialLat: number, initialLng: number) => {
    const apiKey =
      GOOGLE_MAPS_API_KEY &&
      GOOGLE_MAPS_API_KEY !== "YOUR_GOOGLE_MAPS_API_KEY_HERE"
        ? GOOGLE_MAPS_API_KEY
        : null;

    if (!apiKey) {
      // Enhanced Google Maps-style interactive map with very realistic appearance
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body, html { 
                margin: 0; 
                padding: 0; 
                height: 100%; 
                width: 100%; 
                background: #E5E3DF; 
                position: relative; 
                overflow: hidden;
                touch-action: none;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
              }
              .map-base {
                position: absolute;
                width: 100%;
                height: 100%;
                background: #E5E3DF;
              }
              /* Google Maps style base layer */
              .map-layer {
                position: absolute;
                width: 100%;
                height: 100%;
              }
              /* Streets grid pattern */
              .street-grid {
                position: absolute;
                width: 100%;
                height: 100%;
                background-image: 
                  repeating-linear-gradient(0deg, 
                    transparent 0px, 
                    transparent 48px, 
                    rgba(160,160,160,0.25) 48px, 
                    rgba(160,160,160,0.25) 50px,
                    transparent 50px),
                  repeating-linear-gradient(90deg, 
                    transparent 0px, 
                    transparent 48px, 
                    rgba(160,160,160,0.25) 48px, 
                    rgba(160,160,160,0.25) 50px,
                    transparent 50px);
                background-size: 50px 50px;
                pointer-events: none;
              }
              /* Major roads */
              .major-roads {
                position: absolute;
                width: 100%;
                height: 100%;
                background-image: 
                  linear-gradient(90deg, 
                    rgba(180,180,180,0.5) 0%, 
                    rgba(180,180,180,0.5) 3px,
                    transparent 3px, 
                    transparent 47px,
                    rgba(180,180,180,0.5) 47px,
                    rgba(180,180,180,0.5) 50px,
                    transparent 50px),
                  linear-gradient(0deg, 
                    rgba(180,180,180,0.5) 0%, 
                    rgba(180,180,180,0.5) 3px,
                    transparent 3px, 
                    transparent 47px,
                    rgba(180,180,180,0.5) 47px,
                    rgba(180,180,180,0.5) 50px,
                    transparent 50px),
                  linear-gradient(90deg, 
                    transparent 0%,
                    transparent 24%,
                    rgba(200,200,200,0.6) 24%,
                    rgba(200,200,200,0.6) 26%,
                    transparent 26%,
                    transparent 74%,
                    rgba(200,200,200,0.6) 74%,
                    rgba(200,200,200,0.6) 76%,
                    transparent 76%),
                  linear-gradient(0deg, 
                    transparent 0%,
                    transparent 24%,
                    rgba(200,200,200,0.6) 24%,
                    rgba(200,200,200,0.6) 26%,
                    transparent 26%,
                    transparent 74%,
                    rgba(200,200,200,0.6) 74%,
                    rgba(200,200,200,0.6) 76%,
                    transparent 76%);
                background-size: 50px 50px, 50px 50px, 200px 200px, 200px 200px;
                pointer-events: none;
              }
              .buildings-layer {
                position: absolute;
                width: 100%;
                height: 100%;
                pointer-events: none;
              }
              .building-block {
                position: absolute;
                background: #D4CFC9;
                border: 1px solid rgba(200,195,185,0.6);
                border-radius: 1px;
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
              }
              .green-space {
                position: absolute;
                background: #AED581;
                border-radius: 6px;
                border: 1px solid rgba(150,200,150,0.4);
                box-shadow: inset 0 1px 3px rgba(100,150,100,0.2);
              }
              .water-body {
                position: absolute;
                background: #81D4FA;
                border-radius: 8px;
                box-shadow: inset 0 2px 4px rgba(60,120,180,0.3);
                border: 1px solid rgba(60,120,180,0.2);
              }
              .road-label {
                position: absolute;
                background: rgba(255,255,255,0.85);
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 10px;
                color: #333;
                font-weight: 500;
                pointer-events: none;
                z-index: 5;
                white-space: nowrap;
                box-shadow: 0 1px 2px rgba(0,0,0,0.1);
              }
              .location-marker {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -100%);
                z-index: 100;
                cursor: grab;
                touch-action: none;
                transition: transform 0.15s ease-out;
              }
              .location-marker:active {
                cursor: grabbing;
                transform: translate(-50%, -100%) scale(1.15);
              }
              .marker-pin {
                width: 52px;
                height: 52px;
                position: relative;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
              }
              .pin-shadow {
                position: absolute;
                bottom: -10px;
                left: 50%;
                transform: translateX(-50%);
                width: 28px;
                height: 10px;
                background: rgba(0,0,0,0.25);
                border-radius: 50%;
                filter: blur(5px);
              }
              .pin-body {
                position: absolute;
                bottom: 0;
                left: 50%;
                transform: translateX(-50%) rotate(-45deg);
                width: 36px;
                height: 36px;
                background: ${COLORS.primary};
                border-radius: 50% 50% 50% 0;
                box-shadow: 0 3px 10px rgba(0,0,0,0.35);
                border: 3px solid white;
              }
              .pin-center {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(45deg);
                width: 18px;
                height: 18px;
                background: white;
                border-radius: 50%;
                border: 2px solid ${COLORS.primary};
              }
              .pin-pulse {
                position: absolute;
                bottom: -10px;
                left: 50%;
                transform: translateX(-50%);
                width: 36px;
                height: 36px;
                background: ${COLORS.primary};
                border-radius: 50%;
                opacity: 0.4;
                animation: pulse 2s ease-in-out infinite;
              }
              @keyframes pulse {
                0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.4; }
                50% { transform: translateX(-50%) scale(1.6); opacity: 0; }
              }
              .search-bar {
                position: absolute;
                top: 12px;
                left: 12px;
                right: 12px;
                background: white;
                padding: 10px 16px;
                border-radius: 24px;
                box-shadow: 0 2px 12px rgba(0,0,0,0.15);
                font-size: 14px;
                color: #333;
                font-weight: 400;
                z-index: 50;
                border: 1px solid rgba(0,0,0,0.08);
                pointer-events: none;
                display: flex;
                align-items: center;
                gap: 10px;
              }
              .search-icon {
                width: 18px;
                height: 18px;
                opacity: 0.5;
              }
              .info-notice {
                position: absolute;
                bottom: 12px;
                left: 12px;
                right: 12px;
                background: rgba(255,255,255,0.98);
                padding: 10px 14px;
                border-radius: 10px;
                text-align: center;
                box-shadow: 0 2px 10px rgba(0,0,0,0.12);
                font-size: 11px;
                color: #666;
                z-index: 50;
                backdrop-filter: blur(12px);
                line-height: 1.4;
              }
            </style>
          </head>
          <body>
            <div class="map-base" id="mapArea"></div>
            <div class="street-grid"></div>
            <div class="major-roads"></div>
            <div class="buildings-layer" id="buildings"></div>
            <div id="greens"></div>
            <div id="waters"></div>
            <div id="roadLabels"></div>
            <div class="search-bar">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <span>Search this area</span>
            </div>
            <div class="location-marker" id="marker">
              <div class="marker-pin">
                <div class="pin-shadow"></div>
                <div class="pin-pulse"></div>
                <div class="pin-body">
                  <div class="pin-center"></div>
                </div>
              </div>
            </div>
            <div class="info-notice">
              Tap or drag pin to set location • Configure Google Maps API key for satellite view
            </div>
            <script>
              const marker = document.getElementById('marker');
              const mapArea = document.getElementById('mapArea');
              let isDragging = false;
              
              // Create realistic map elements
              function createMapElements() {
                const buildings = document.getElementById('buildings');
                const greens = document.getElementById('greens');
                const waters = document.getElementById('waters');
                const roadLabels = document.getElementById('roadLabels');
                
                // Create building blocks (realistic urban layout)
                const buildingPositions = [];
                for (let i = 0; i < 60; i++) {
                  const building = document.createElement('div');
                  building.className = 'building-block';
                  const width = 20 + Math.random() * 45;
                  const height = 25 + Math.random() * 65;
                  const left = Math.random() * 95;
                  const top = Math.random() * 95;
                  
                  // Avoid overlapping too much
                  let valid = true;
                  for (let pos of buildingPositions) {
                    if (Math.abs(pos.left - left) < 10 && Math.abs(pos.top - top) < 10) {
                      valid = false;
                      break;
                    }
                  }
                  
                  if (valid) {
                    building.style.width = width + 'px';
                    building.style.height = height + 'px';
                    building.style.left = left + '%';
                    building.style.top = top + '%';
                    building.style.opacity = 0.75 + Math.random() * 0.25;
                    building.style.background = '#' + ['D4CFC9', 'CFCAC4', 'D9D4CE', 'CEC9C3'][Math.floor(Math.random() * 4)];
                    buildings.appendChild(building);
                    buildingPositions.push({left, top});
                  }
                }
                
                // Create green spaces (parks)
                for (let i = 0; i < 10; i++) {
                  const green = document.createElement('div');
                  green.className = 'green-space';
                  const width = 70 + Math.random() * 100;
                  const height = 70 + Math.random() * 100;
                  green.style.width = width + 'px';
                  green.style.height = height + 'px';
                  green.style.left = Math.random() * 85 + '%';
                  green.style.top = Math.random() * 85 + '%';
                  greens.appendChild(green);
                }
                
                // Create water bodies
                for (let i = 0; i < 5; i++) {
                  const water = document.createElement('div');
                  water.className = 'water-body';
                  const width = 60 + Math.random() * 90;
                  const height = 40 + Math.random() * 70;
                  water.style.width = width + 'px';
                  water.style.height = height + 'px';
                  water.style.left = Math.random() * 85 + '%';
                  water.style.top = Math.random() * 85 + '%';
                  waters.appendChild(water);
                }
                
                // Add road labels
                const roadNames = ['Main St', 'Park Ave', 'First St', 'Broadway', 'Oak St', 'Elm Ave', 'Maple Dr', 'Cedar Ln'];
                for (let i = 0; i < 8; i++) {
                  const label = document.createElement('div');
                  label.className = 'road-label';
                  label.textContent = roadNames[i];
                  label.style.left = (10 + i * 12) + '%';
                  label.style.top = (15 + (i % 3) * 30) + '%';
                  roadLabels.appendChild(label);
                }
              }
              
              function updateMarkerPosition(x, y) {
                marker.style.left = x + '%';
                marker.style.top = y + '%';
                
                // Calculate lat/lng
                const lat = ${initialLat} + ((y - 50) / 50) * 0.018;
                const lng = ${initialLng} + ((x - 50) / 50) * 0.018;
                
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'locationChange',
                    latitude: lat,
                    longitude: lng
                  }));
                }
              }
              
              // Mouse/Touch handlers
              marker.addEventListener('mousedown', (e) => {
                isDragging = true;
                e.preventDefault();
              });
              
              marker.addEventListener('touchstart', (e) => {
                isDragging = true;
                e.preventDefault();
              });
              
              mapArea.addEventListener('mousemove', (e) => {
                if (isDragging) {
                  const rect = mapArea.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  updateMarkerPosition(Math.max(5, Math.min(95, x)), Math.max(5, Math.min(95, y)));
                }
              });
              
              mapArea.addEventListener('touchmove', (e) => {
                if (isDragging && e.touches[0]) {
                  e.preventDefault();
                  const touch = e.touches[0];
                  const rect = mapArea.getBoundingClientRect();
                  const x = ((touch.clientX - rect.left) / rect.width) * 100;
                  const y = ((touch.clientY - rect.top) / rect.height) * 100;
                  updateMarkerPosition(Math.max(5, Math.min(95, x)), Math.max(5, Math.min(95, y)));
                }
              });
              
              mapArea.addEventListener('click', (e) => {
                if (!isDragging) {
                  const rect = mapArea.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  updateMarkerPosition(x, y);
                }
              });
              
              mapArea.addEventListener('touchend', (e) => {
                if (!isDragging && e.changedTouches[0]) {
                  e.preventDefault();
                  const touch = e.changedTouches[0];
                  const rect = mapArea.getBoundingClientRect();
                  const x = ((touch.clientX - rect.left) / rect.width) * 100;
                  const y = ((touch.clientY - rect.top) / rect.height) * 100;
                  updateMarkerPosition(x, y);
                }
              });
              
              document.addEventListener('mouseup', () => { isDragging = false; });
              document.addEventListener('touchend', () => { isDragging = false; });
              
              // Initialize
              createMapElements();
              
              // Send initial location
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'locationChange',
                  latitude: ${initialLat},
                  longitude: ${initialLng}
                }));
              }
            </script>
          </body>
        </html>
      `;
    }

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
                
                // Send initial location
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'locationChange',
                  latitude: initialPosition.lat,
                  longitude: initialPosition.lng,
                }));
                
                // Helper function to reverse geocode and send address
                function reverseGeocode(lat, lng) {
                  const geocoder = new google.maps.Geocoder();
                  geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'addressUpdate',
                        address: results[0].formatted_address,
                        components: results[0].address_components
                      }));
                    }
                  });
                }
                
                // Handle map click - move marker to clicked location
                map.addListener('click', (e) => {
                  const lat = e.latLng.lat();
                  const lng = e.latLng.lng();
                  marker.setPosition({ lat, lng });
                  map.panTo({ lat, lng });
                  
                  reverseGeocode(lat, lng);
                  
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'locationChange',
                    latitude: lat,
                    longitude: lng
                  }));
                });
                
                // Handle marker drag
                marker.addListener('dragstart', () => {
                  marker.setAnimation(google.maps.Animation.BOUNCE);
                });
                
                marker.addListener('dragend', (e) => {
                  marker.setAnimation(null);
                  const lat = e.latLng.lat();
                  const lng = e.latLng.lng();
                  map.panTo({ lat, lng });
                  
                  reverseGeocode(lat, lng);
                  
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'locationChange',
                    latitude: lat,
                    longitude: lng
                  }));
                });
                
                // Handle map center change (when user pans map)
                map.addListener('center_changed', () => {
                  const center = map.getCenter();
                  if (center) {
                    const lat = center.lat();
                    const lng = center.lng();
                    // Update marker to follow map center
                    marker.setPosition({ lat, lng });
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      type: 'locationChange',
                      latitude: lat,
                      longitude: lng
                    }));
                  }
                });
                
                // Enable traffic layer for clear road visualization
                const trafficLayer = new google.maps.TrafficLayer();
                trafficLayer.setMap(map);
                
                mapLoaded = true;
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
            
            // Load Google Maps API with Places and Visualization libraries
            const script = document.createElement('script');
            script.src = 'https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,visualization&callback=initMap';
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
    if (!locationData) {
      Alert.alert(t("locationRequired"), t("pleaseWaitForLocationDetected"));
    }

    try {
      // Generate a unique ID for the address
      const addressId = `addr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Prepare address data
      const addressToSave = {
        id: addressId,
        type: saveAsName || saveAs || "Home",
        address:
          locationData.fullAddress.length > 30
            ? locationData.fullAddress.substring(0, 30) + "..."
            : locationData.fullAddress,
        fullAddress: locationData.fullAddress,
        location: {
          lat: locationData.latitude,
          lng: locationData.longitude,
        },
      };

      // Save address to storage
      await addressStorage.addAddress(addressToSave);
      // Set as selected address
      await addressStorage.setSelectedAddressId(addressId);

      if (fromCurrentLocation) {
        // Redirect directly to home page with updated location
        router.push("/(customer)");
      } else {
        // After saving, redirect back to enter your area page
        Alert.alert(t("success"), t("addressSaved"), [
          {
            text: t("ok"),
            onPress: () => router.push("/(customer)/address/search"),
          },
        ]);
      }
    } catch (error) {
      console.error("Error saving address:", error);
      Alert.alert(t("error"), t("failedToSaveAddress"));
    }
  };

  const getTagIcon = (tag: string) => {
    switch (tag) {
      case "Home":
        return "🏠";
      case "Work":
        return "💼";
      case "Friends and Family":
        return "👥";
      case "Others":
        return "📍";
      default:
        return "📍";
    }
  };

  const initialLat = locationData?.latitude || 13.0827; // Default to Chennai
  const initialLng = locationData?.longitude || 80.2707;

  return (
    <View style={styles.container}>
      {/* Real Map using WebView */}
      <WebView
        ref={webViewRef}
        style={styles.mapContainer}
        source={{ html: generateMapHTML(initialLat, initialLng) }}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "locationChange") {
              handleMapRegionChangeComplete({
                latitude: data.latitude,
                longitude: data.longitude,
              });
            } else if (data.type === "addressUpdate") {
              // Update address fields when location changes
              const address = data.address || "";
              const components = data.components || [];

              // Extract address components
              let street = "";
              let city = "";
              let region = "";
              let postalCode = "";
              let name = "";

              components.forEach((component: any) => {
                const types = component.types;
                if (
                  types.includes("street_number") ||
                  types.includes("route")
                ) {
                  street = (street + " " + component.long_name).trim();
                }
                if (types.includes("locality")) {
                  city = component.long_name;
                }
                if (types.includes("administrative_area_level_1")) {
                  region = component.long_name;
                }
                if (types.includes("postal_code")) {
                  postalCode = component.long_name;
                }
                if (types.includes("premise") || types.includes("subpremise")) {
                  name = component.long_name;
                }
              });

              // Update location data with new address
              setLocationData((prev) =>
                prev
                  ? {
                      ...prev,
                      street: street || prev.street,
                      city: city || prev.city,
                      region: region || prev.region,
                      postalCode: postalCode || prev.postalCode,
                      name: name || prev.name,
                      fullAddress: address || prev.fullAddress,
                    }
                  : null,
              );
            } else if (data.type === "error") {
              console.error("Map error:", data.message);
              Alert.alert(
                "Map Loading Error",
                data.message ||
                  "Unable to load Google Maps. Please check your internet connection and try again.",
                [{ text: "OK" }],
              );
            }
          } catch (error) {
            console.error("Error parsing map message:", error);
          }
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error("WebView error:", nativeEvent);
          Alert.alert(
            "Map Error",
            "Unable to load the map. Please check your internet connection and ensure Google Maps API key is configured.",
            [{ text: "OK" }],
          );
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />

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
            placeholder={t("addressSearchPlaceholder")}
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

      {/* Bottom Sheet */}
      <View
        style={[
          styles.bottomSheet,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 16 },
        ]}
      >
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
                  placeholder={t("houseFlatBlockPlaceholder")}
                  style={styles.input}
                  placeholderTextColor="#94A3B8"
                  value={houseNumber}
                  onChangeText={setHouseNumber}
                />
                <TextInput
                  placeholder={t("apartmentRoadPlaceholder")}
                  style={styles.input}
                  placeholderTextColor="#94A3B8"
                  value={apartmentRoad}
                  onChangeText={setApartmentRoad}
                />
              </View>

              {/* Save As Section */}
              <Text style={styles.saveAsLabel}>{t("saveAs")}</Text>
              <View
                style={
                  saveAs === "Others"
                    ? styles.tagsContainerWithOthers
                    : styles.tagsContainer
                }
              >
                {["Home", "Work", "Friends and Family", "Others"].map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tag, saveAs === tag && styles.activeTag]}
                    onPress={() => setSaveAs(tag)}
                  >
                    <Text style={styles.tagIcon}>{getTagIcon(tag)}</Text>
                    <Text
                      style={[
                        styles.tagText,
                        saveAs === tag && styles.activeTagText,
                      ]}
                    >
                      {t(tag)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Save As Name Input - Only show for Others */}
              {saveAs === "Others" && (
                <View style={styles.saveAsNameSection}>
                  <Text style={styles.saveAsNameLabel}>{t("saveAsName")}</Text>
                  <TextInput
                    placeholder={t("enterName")}
                    style={styles.input}
                    placeholderTextColor="#94A3B8"
                    value={saveAsName}
                    onChangeText={setSaveAsName}
                  />
                </View>
              )}

              {/* Receiver's Phone Number Section - Show for Work, Friends and Family, or Others */}
              {(saveAs === "Work" ||
                saveAs === "Friends and Family" ||
                saveAs === "Others") && (
                <View
                  style={
                    saveAs === "Others"
                      ? styles.receiverPhoneSectionOthers
                      : styles.receiverPhoneSection
                  }
                >
                  <Text style={styles.receiverPhoneLabel}>
                    {t("receiversPhoneNumberOptional")}
                  </Text>
                  <Text style={styles.receiverPhoneHint}>
                    {t("receiverPhoneHint")}
                  </Text>
                  <TextInput
                    placeholder={t("enterReceiversPhoneNumber")}
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
              {fromCurrentLocation ? t("confirmProceed") : t("saveAddress")}
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
    backgroundColor: "#1E293B",
  },
  mapContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  customMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  markerPin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  topBarContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 20,
  },
  backButton: {
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
    marginRight: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginRight: 8,
    shadowColor: "#000",
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
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#F0F9FF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "55%",
    shadowColor: "#000",
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
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "flex-start",
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
    fontWeight: "bold",
    color: "#102841",
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: "#102841",
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: "#0C4A6E",
    lineHeight: 20,
  },
  form: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#102841",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  saveAsLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#102841",
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 24,
    gap: 8,
  },
  tagsContainerWithOthers: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
    gap: 8,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 8,
    marginBottom: 8,
  },
  activeTag: {
    backgroundColor: "#102841",
    borderColor: "#102841",
  },
  tagIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  tagText: {
    fontSize: 14,
    color: "#102841",
    fontWeight: "500",
  },
  activeTagText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  saveAsNameSection: {
    marginBottom: 12,
  },
  saveAsNameLabel: {
    fontSize: 15,
    color: "#102841",
    marginBottom: 8,
    fontWeight: "500",
  },
  receiverPhoneSection: {
    marginBottom: 24,
  },
  receiverPhoneSectionOthers: {
    marginBottom: 12,
  },
  receiverPhoneLabel: {
    fontSize: 15,
    color: "#102841",
    marginBottom: 6,
    fontWeight: "500",
  },
  receiverPhoneHint: {
    fontSize: 12,
    color: "#102841",
    marginBottom: 12,
    lineHeight: 16,
  },
  confirmButton: {
    backgroundColor: "#102841",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 0,
    marginTop: 8,
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
