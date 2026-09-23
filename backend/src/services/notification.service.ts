import { Staff } from '../models/Staff.model';

/**
 * Send push notification to all online staff members
 * Note: This is a simplified version. For production, you'll need to:
 * 1. Install firebase-admin: npm install firebase-admin
 * 2. Set up Firebase Admin SDK with service account
 * 3. Use admin.messaging().send() to send notifications
 * 
 * For now, this logs the notification that should be sent.
 * You can integrate with Expo's push notification service or Firebase Cloud Messaging.
 */
export const sendNotificationToStaff = async (order: any) => {
  try {
    // Get all online staff members
    const onlineStaff = await Staff.find({ 
      isOnline: true,
      fcmToken: { $exists: true, $ne: null }
    }).populate('userId', 'name');

    console.log(`🔍 Checking for online staff. Found ${onlineStaff.length} online staff members`);
    
    if (onlineStaff.length === 0) {
      console.log('⚠️ No online staff with FCM tokens found');
      // Also check if there are online staff without tokens
      const onlineWithoutTokens = await Staff.find({ isOnline: true, fcmToken: { $exists: false } });
      if (onlineWithoutTokens.length > 0) {
        console.log(`⚠️ Found ${onlineWithoutTokens.length} online staff but they don't have FCM tokens registered`);
      }
      return;
    }

    const notificationData = {
      title: 'New Order Available',
      body: `New order for ${order.quantity} can(s) at ${order.deliveryAddress?.substring(0, 50)}...`,
      data: {
        orderId: order._id.toString(),
        type: 'new_order',
      },
      sound: 'default',
      priority: 'high',
    };

    console.log(`📱 Sending notification to ${onlineStaff.length} staff members:`, notificationData);
    console.log(`📱 Staff tokens:`, onlineStaff.map(s => ({ name: s.name, hasToken: !!s.fcmToken, tokenPreview: s.fcmToken?.substring(0, 20) + '...' })));

    // TODO: Implement actual FCM/Expo push notification sending
    // For Expo, you can use: https://docs.expo.dev/push-notifications/sending-notifications/
    // For Firebase, use Firebase Admin SDK
    
    // Example with Expo Push Notification API:
    // const messages = onlineStaff.map(staff => ({
    //   to: staff.fcmToken,
    //   sound: 'default',
    //   title: notificationData.title,
    //   body: notificationData.body,
    //   data: notificationData.data,
    // }));
    // 
    // await fetch('https://exp.host/--/api/v2/push/send', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify(messages),
    // });

    // Send notifications to all online staff
    const sendPromises = onlineStaff.map(staff => {
      if (staff.fcmToken) {
        console.log(`📤 Sending notification to staff ${staff.name} (${staff._id})`);
        return sendExpoPushNotification(staff.fcmToken, notificationData);
      }
      return Promise.resolve();
    });
    
    await Promise.all(sendPromises);
    console.log(`✅ Finished sending notifications to ${onlineStaff.length} staff members`);
  } catch (error: any) {
    console.error('Error sending notification to staff:', error);
  }
};

/**
 * Send push notification using Expo Push Notification API
 */
async function sendExpoPushNotification(token: string, notification: any) {
  try {
    console.log(`📲 Attempting to send notification to token: ${token.substring(0, 20)}...`);
    
    const payload = {
      to: token,
      sound: notification.sound || 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data,
      priority: notification.priority || 'default',
    };

    console.log('📤 Sending payload:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json() as {
      data?: {
        status?: string;
        message?: string;
        details?: {
          error?: string;
        };
      };
    };
    
    console.log('📥 Expo API response:', JSON.stringify(result, null, 2));
    
    if (result.data?.status === 'error') {
      console.error('❌ Push notification error:', result.data.message);
      // If token is invalid, remove it from staff profile
      if (result.data.details?.error === 'DeviceNotRegistered') {
        console.log('🗑️ Removing invalid token from database');
        await Staff.updateOne(
          { fcmToken: token },
          { $unset: { fcmToken: 1 } }
        );
      }
    } else {
      console.log('✅ Push notification sent successfully to Expo');
    }
  } catch (error: any) {
    console.error('❌ Error sending Expo push notification:', error.message || error);
  }
}

