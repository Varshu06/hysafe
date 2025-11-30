import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MapPicker } from '../../../src/components/customer/MapPicker';
import { Button } from '../../../src/components/ui/Button';
import { COLORS } from '../../../src/utils/constants';

export default function AddAddressScreen() {
  const router = useRouter();
  const [saveAs, setSaveAs] = useState('Home');

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
         <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
         </TouchableOpacity>
         <MapPicker />
      </View>

      <View style={styles.sheet}>
         <View style={styles.locationHeader}>
             <Text style={styles.locationIcon}>📍</Text>
             <View>
                 <Text style={styles.locationTitle}>7th Ave</Text>
                 <Text style={styles.locationDesc}>
                    7th Ave, Grand Northern Trunk Rd, Thirumangalam, chennai-28.
                 </Text>
             </View>
         </View>

         <View style={styles.infoBox}>
            <Text style={styles.infoText}>
                The more accurate your address, the quicker we can reach you!
            </Text>
         </View>

         <View style={styles.form}>
            <TextInput 
                placeholder="House / Flat / Block number."
                style={styles.input}
                placeholderTextColor="#94A3B8"
            />
            <TextInput 
                placeholder="Appartment / Road / Area (Recommended)"
                style={styles.input}
                placeholderTextColor="#94A3B8"
            />
         </View>

         <Text style={styles.saveAsLabel}>Save As</Text>
         <View style={styles.tagsContainer}>
            {['Home', 'Work', 'Friends and Family', 'Others'].map((tag) => (
                <TouchableOpacity 
                    key={tag} 
                    style={[styles.tag, saveAs === tag && styles.activeTag]}
                    onPress={() => setSaveAs(tag)}
                >
                   <Text style={styles.tagIcon}>
                       {tag === 'Home' ? '🏠' : tag === 'Work' ? '💼' : tag === 'Others' ? '📍' : '👥'}
                   </Text>
                   <Text style={[styles.tagText, saveAs === tag && styles.activeTagText]}>
                       {tag}
                   </Text>
                </TouchableOpacity>
            ))}
         </View>

         <View style={styles.footer}>
            <Button 
                title="Confirm/Proceed" 
                onPress={() => router.push('/(customer)/products')}
                variant="primary"
            />
         </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  mapContainer: {
      height: 300,
      position: 'relative',
  },
  backButton: {
      position: 'absolute',
      top: 50,
      left: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'white',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
      elevation: 5,
  },
  backIcon: {
      fontSize: 24,
      color: COLORS.text,
  },
  sheet: {
      flex: 1,
      backgroundColor: '#E0F2FE',
      marginTop: -20,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
  },
  locationHeader: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
  },
  locationIcon: {
      fontSize: 24,
      marginTop: 4,
  },
  locationTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: COLORS.text,
      marginBottom: 4,
  },
  locationDesc: {
      fontSize: 14,
      color: '#475569',
      lineHeight: 20,
      paddingRight: 40,
  },
  infoBox: {
      backgroundColor: '#BAE6FD',
      padding: 12,
      borderRadius: 8,
      marginBottom: 24,
  },
  infoText: {
      color: '#0C4A6E',
      fontSize: 14,
      textAlign: 'center',
  },
  form: {
      gap: 16,
      marginBottom: 24,
  },
  input: {
      borderBottomWidth: 1,
      borderBottomColor: '#94A3B8',
      paddingVertical: 8,
      fontSize: 16,
      color: COLORS.text,
  },
  saveAsLabel: {
      fontSize: 16,
      fontWeight: 'bold',
      color: COLORS.text,
      marginBottom: 12,
  },
  tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 40,
  },
  tag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: COLORS.text,
      backgroundColor: 'transparent',
  },
  activeTag: {
      backgroundColor: '#BAE6FD', // Light blue selection
      borderColor: '#BAE6FD',
  },
  tagText: {
      fontSize: 14,
      fontWeight: '500',
      color: COLORS.text,
  },
  activeTagText: {
      color: COLORS.text,
  },
  tagIcon: {
      fontSize: 16,
  },
  footer: {
      marginTop: 'auto',
  }
});

