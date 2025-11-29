import * as admin from 'firebase-admin';
import { getIO } from '../config/socket.io';

/**
 * Initialize Firebase Admin SDK
 * Note: This requires Firebase credentials in environment variables
 */
let firebaseInitialized = false;

export const initializeFirebase = (): void => {
  if (firebaseInitialized) {
    return;
  }

  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    if (serviceAccount.projectId && serviceAccount.privateKey && serviceAccount.clientEmail) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });
      firebaseInitialized = true;
      console.log('✅ Firebase Admin initialized');
    } else {
      console.log('⚠️ Firebase credentials not provided, push notifications disabled');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error);
  }
};

/**
 * Send push notification via FCM
 */
export const sendPushNotification = async (
  fcmToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  if (!firebaseInitialized) {
    console.log('⚠️ Firebase not initialized, skipping push notification');
    return;
  }

  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: data || {},
    });
    console.log('✅ Push notification sent');
  } catch (error) {
    console.error('❌ Failed to send push notification:', error);
  }
};

/**
 * Send notification to multiple devices
 */
export const sendBulkNotifications = async (
  fcmTokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  if (!firebaseInitialized || fcmTokens.length === 0) {
    return;
  }

  try {
    const messages = fcmTokens.map((token) => ({
      token,
      notification: { title, body },
      data: data || {},
    }));

    await admin.messaging().sendAll(messages);
    console.log(`✅ Sent ${messages.length} push notifications`);
  } catch (error) {
    console.error('❌ Failed to send bulk notifications:', error);
  }
};

/**
 * Notify customer about order status update
 */
export const notifyOrderStatusUpdate = async (
  fcmToken: string | undefined,
  orderId: string,
  status: string
): Promise<void> => {
  const statusMessages: Record<string, { title: string; body: string }> = {
    accepted: {
      title: 'Order Accepted',
      body: 'Your order has been accepted and is being prepared',
    },
    picked: {
      title: 'Order Picked Up',
      body: 'Your order has been picked up and is on the way',
    },
    transit: {
      title: 'On The Way',
      body: 'Your order is on the way to your location',
    },
    delivered: {
      title: 'Order Delivered',
      body: 'Your order has been delivered successfully',
    },
    cancelled: {
      title: 'Order Cancelled',
      body: 'Your order has been cancelled',
    },
  };

  const message = statusMessages[status] || {
    title: 'Order Update',
    body: `Your order status has been updated to ${status}`,
  };

  if (fcmToken) {
    await sendPushNotification(fcmToken, message.title, message.body, {
      orderId,
      status,
      type: 'order-status-update',
    });
  }

  // Also emit via Socket.io (real-time)
  getIO().emit('order-status-updated', {
    orderId,
    status,
  });
};

/**
 * Notify staff about new order
 */
export const notifyNewOrder = async (
  fcmTokens: string[],
  orderId: string,
  quantity: number,
  deliveryAddress: string
): Promise<void> => {
  const title = 'New Order Available';
  const body = `${quantity} x 20L cans to ${deliveryAddress.substring(0, 30)}...`;

  await sendBulkNotifications(fcmTokens, title, body, {
    orderId,
    quantity: quantity.toString(),
    type: 'new-order',
  });

  // Also emit via Socket.io (real-time)
  getIO().emit('new-order', {
    orderId,
    quantity,
    deliveryAddress,
  });
};


