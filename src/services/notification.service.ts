import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { storage } from '../utils/storage';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions and get the Expo push token
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    console.log('🔔 Starting push notification registration...');
    
    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('📋 Current notification permission status:', existingStatus);
    
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      console.log('📋 Requesting notification permissions...');
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: false,
        } as any,
      });
      finalStatus = status;
      console.log('📋 Permission request result:', status);
    }

    if (finalStatus !== 'granted') {
      console.error('❌ Notification permissions not granted. Status:', finalStatus);
      return null;
    }

    console.log('✅ Notification permissions granted');

    // Get the Expo push token
    // Note: For Expo Go, we need to use the app slug as projectId
    // For standalone builds, you need to configure EAS and set up credentials
    try {
      console.log('📱 Requesting Expo push token...');
      
      let tokenData;
      let token: string | null = null;
      
      // Get projectId - in Expo Go, use the experience name (slug)
      // Try multiple sources for projectId
      let projectId: string | undefined;
      
      // Method 1: Try from Constants
      if (Constants.expoConfig?.extra?.eas?.projectId) {
        projectId = Constants.expoConfig.extra.eas.projectId;
        console.log('📱 Using EAS projectId from Constants:', projectId);
      } else if (Constants.expoConfig?.slug) {
        projectId = Constants.expoConfig.slug;
        console.log('📱 Using slug from Constants:', projectId);
      } else if (Constants.manifest?.slug) {
        projectId = Constants.manifest.slug;
        console.log('📱 Using slug from manifest:', projectId);
      } else {
        // Fallback to app.json slug
        projectId = 'hysafe-mobile';
        console.log('📱 Using fallback projectId:', projectId);
      }
      
      console.log('📱 Full Constants info:', {
        expoConfig: Constants.expoConfig ? 'exists' : 'null',
        manifest: Constants.manifest ? 'exists' : 'null',
        projectId: projectId,
      });
      
      // Try to get the push token with the projectId
      // In Expo Go, this might require EAS project setup
      try {
        tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        });
        token = tokenData.data;
      } catch (projectIdError: any) {
        // If projectId error, try without it (some Expo Go versions work)
        if (projectIdError.message?.includes('projectId') || 
            projectIdError.code === 'E_NOTIFICATIONS_NOT_CONFIGURED') {
          console.warn('⚠️ ProjectId error, trying without projectId...');
          try {
            tokenData = await Notifications.getExpoPushTokenAsync();
            token = tokenData.data;
            console.log('✅ Got token without projectId');
          } catch (noProjectIdError: any) {
            console.warn('⚠️ Push notifications not available:', noProjectIdError.message);
            console.warn('💡 This is normal in Expo Go without EAS project setup.');
            console.warn('💡 The app will continue to work, but push notifications will not be sent.');
            console.warn('💡 For production: Set up EAS at https://expo.dev and add projectId to app.json');
            // Don't throw - just return null so app continues to work
            return null;
          }
        } else {
          // Other errors - log but don't break the app
          console.warn('⚠️ Error getting push token:', projectIdError.message);
          return null;
        }
      }

      if (!token || token.length < 10) {
        console.error('❌ Invalid Expo push token received');
        return null;
      }
      
      console.log('📱 Expo Push Token received:', token);
      console.log('📱 Token length:', token.length);
      
      // Store token locally
      await storage.setFCMToken(token);
      console.log('✅ FCM token stored locally');
      
      return token;
    } catch (tokenError: any) {
      // Log as warning, not error, since this is expected in Expo Go without EAS
      console.warn('⚠️ Push notifications not available:', tokenError.message || tokenError);
      console.warn('💡 This is normal in Expo Go without EAS project setup.');
      console.warn('💡 The app will continue to work, but push notifications will not be sent.');
      console.warn('💡 For production: Set up EAS at https://expo.dev and add projectId to app.json');
      // Return null gracefully - don't break the app
      return null;
    }
  } catch (error: any) {
    // Log as warning, not error, since this is expected in Expo Go without EAS
    console.warn('⚠️ Push notification registration failed:', error.message || error);
    console.warn('💡 This is normal in Expo Go without EAS project setup.');
    console.warn('💡 The app will continue to work, but push notifications will not be sent.');
    // Return null gracefully - don't break the app
    return null;
  }
};

/**
 * Get stored FCM token
 */
export const getStoredFCMToken = async (): Promise<string | null> => {
  return await storage.getFCMToken();
};

/**
 * Setup notification listeners
 */
export const setupNotificationListeners = (
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (response: Notifications.NotificationResponse) => void
) => {
  // Listener for notifications received while app is in foreground
  const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('📬 Notification received:', notification);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Listener for when user taps on a notification
  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('👆 Notification tapped:', response);
    if (onNotificationTapped) {
      onNotificationTapped(response);
    }
  });

  return () => {
    receivedListener.remove();
    responseListener.remove();
  };
};

/**
 * Get the last notification response (when app opens from notification)
 */
export const getLastNotificationResponse = async (): Promise<Notifications.NotificationResponse | null> => {
  return await Notifications.getLastNotificationResponseAsync();
};

