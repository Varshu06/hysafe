import { Feather, Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

export default function SaveAddressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [houseNumber, setHouseNumber] = useState('');
  const [apartmentRoad, setApartmentRoad] = useState('');
  const [saveAs, setSaveAs] = useState('Home');
  const [receiverPhone, setReceiverPhone] = useState('');

  useEffect(() => {
    if (params.latitude && params.longitude) {
      setLocationData({
        latitude: parseFloat(params.latitude as string),
        longitude: parseFloat(params.longitude as string),
        street: params.street as string || '',
        city: params.city as string || '',
        region: params.region as string || '',
        postalCode: params.postalCode as string || '',
        name: params.name as string || '',
        fullAddress: params.fullAddress as string || '',
      });
    }
  }, [params]);

  const getShortAddress = () => {
    if (!locationData) return 'Select Location';
    return locationData.name || locationData.street || 'Selected Location';
  };

  const getFullAddress = () => {
    if (!locationData) return 'Location not available';
    return locationData.fullAddress || 'Location detected';
  };

  const handleSave = () => {
    if (!locationData) {
      Alert.alert('Error', 'Location data is missing.');
      return;
    }
    
    // Here you would save the address with houseNumber, apartmentRoad, and saveAs
    Alert.alert('Success', 'Address saved successfully!', [
      { text: 'OK', onPress: () => router.push('/(customer)/address/search') }
    ]);
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
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Save Address</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Location Info */}
        <View style={styles.locationInfo}>
          <View style={styles.locationIconContainer}>
            <Ionicons name="location-sharp" size={24} color="#3B82F6" />
          </View>
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationTitle}>{getShortAddress()}</Text>
            <Text style={styles.locationAddress} numberOfLines={2}>
              {getFullAddress()}
            </Text>
          </View>
        </View>

        {/* Information Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            The more accurate your address, the quicker we can reach you!
          </Text>
        </View>

        {/* Form Inputs */}
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
        <View style={styles.tagsContainer}>
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

        {/* Receiver's Phone Number Section - Only show for Work or Friends and Family */}
        {(saveAs === 'Work' || saveAs === 'Friends and Family') && (
          <View style={styles.receiverPhoneSection}>
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

        {/* Save Address Button */}
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save Address</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#0F172A',
  },
  backButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  locationInfo: {
    flexDirection: 'row',
    marginBottom: 16,
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
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: 'white',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  saveAsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
    marginRight: 8,
    marginBottom: 8,
  },
  activeTag: {
    backgroundColor: 'white',
    borderColor: '#0F172A',
  },
  tagIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  tagText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  activeTagText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  receiverPhoneSection: {
    marginBottom: 24,
  },
  receiverPhoneLabel: {
    fontSize: 15,
    color: '#94A3B8',
    marginBottom: 6,
    fontWeight: '500',
  },
  receiverPhoneHint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 16,
  },
  saveButton: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 0,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});



