import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { API_BASE_URL, GOOGLE_CLIENT_ID_WEB, GOOGLE_CLIENT_ID_ANDROID } from '../utils/constants';

// Complete the auth session
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Sign in with Google
 */
export const signInWithGoogle = async (): Promise<GoogleUserInfo> => {
  throw new Error('Google Sign-In is disabled for this launch.');
};

export const signInWithGoogleDisabled = async (): Promise<GoogleUserInfo> => {
  
  console.log(`📱 Using ${Platform.OS} Client ID for Google OAuth`);

  try {
    // For Android: Use the app's custom scheme (package name based)
    // For Web/iOS: Use Expo proxy or localhost
    let redirectUri: string;
    let useProxy = false;
    
    if (Platform.OS === 'android') {
      // Android OAuth uses package name, not redirect URI
      // Use the app's custom scheme
      redirectUri = AuthSession.makeRedirectUri({
        scheme: 'hysafe',
        path: 'auth',
      });
      console.log('✅ Using Android redirect URI:', redirectUri);
      console.log('📝 Android OAuth uses package name (com.hysafe.mobile) for verification');
    } else {
      // For Web/iOS: Try Expo proxy first, fallback to localhost
      try {
        // Try Expo proxy (requires Expo account)
        const proxyUri = AuthSession.makeRedirectUri({ useProxy: true } as any);
        if (proxyUri && proxyUri.startsWith('https://auth.expo.io')) {
          redirectUri = proxyUri;
          useProxy = true;
          console.log('✅ Using Expo proxy URI:', redirectUri);
          console.log('📝 Add this URI to Google Cloud Console → OAuth Client → Authorized redirect URIs');
        } else {
          throw new Error('Proxy not available');
        }
      } catch (proxyError) {
        // Fallback: Use localhost (works for development but may have issues)
        redirectUri = 'http://localhost:8081';
        console.log('⚠️ Using localhost redirect URI:', redirectUri);
        console.log('📝 Add this URI to Google Cloud Console → Web OAuth Client → Authorized redirect URIs');
      }
    }
    
    console.log('🔗 Final redirect URI:', redirectUri);

    // Create auth request with token flow (implicit flow)
    // Note: Token flow (implicit) doesn't support PKCE - only Code flow does
    // For Android: Don't use proxy (uses package name verification)
    // For Web: Don't use proxy to avoid PKCE issues with Token flow
    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Token, // Implicit flow - token in URL hash
      redirectUri,
      useProxy: false, // Set to false for both Android and Web to avoid PKCE issues
    } as any);

    // Get authorization URL
    const authUrl = await request.makeAuthUrlAsync(discovery);
    console.log('🔗 Auth URL generated');

    // Open browser for authentication using WebBrowser
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      redirectUri
    );

    console.log('🔗 Auth result type:', result.type);
    console.log('🔗 Auth result URL:', result.type === 'success' ? result.url : undefined);
    
    if (result.type === 'success' && result.url) {
      console.log('🔗 Success! Parsing response URL...');
      console.log('🔗 Full result URL:', result.url);
      
      // Parse the URL to get the access token
      // For token response type, the token is in the URL hash
      const urlHash = result.url.split('#')[1];
      if (!urlHash) {
        console.error('❌ No hash in URL:', result.url);
        // Check if error is in query params instead
        const urlParams = new URLSearchParams(result.url.split('?')[1] || '');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        if (error) {
          // Provide specific error messages for common issues
          if (error === 'access_denied' || errorDescription?.toLowerCase().includes('access blocked')) {
            throw new Error('ACCESS_BLOCKED: Your Google account is not authorized. Please add your email as a test user in Google Cloud Console or publish the app.');
          }
          throw new Error(errorDescription || error || 'OAuth authentication failed');
        }
        throw new Error('No access token found in response URL');
      }

      const urlParams = new URLSearchParams(urlHash);
      const accessToken = urlParams.get('access_token');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      if (error) {
        console.error('❌ OAuth error:', error, errorDescription);
        // Provide specific error messages for common issues
        if (error === 'access_denied' || errorDescription?.toLowerCase().includes('access blocked')) {
          throw new Error('ACCESS_BLOCKED: Your Google account is not authorized. Please add your email as a test user in Google Cloud Console or publish the app.');
        }
        throw new Error(errorDescription || error || 'OAuth authentication failed');
      }

      if (!accessToken) {
        console.error('❌ No access token in URL params. Available params:', Array.from(urlParams.keys()));
        throw new Error('No access token received from Google');
      }

      console.log('✅ Access token received, fetching user info...');

      // Fetch user info from Google
      const userInfoResponse = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
      );
      
      if (!userInfoResponse.ok) {
        const errorText = await userInfoResponse.text();
        console.error('❌ Failed to fetch user info:', errorText);
        throw new Error(`Failed to fetch user info from Google: ${errorText}`);
      }
      
      const userInfo: GoogleUserInfo = await userInfoResponse.json();
      console.log('✅ User info fetched successfully');
      return userInfo;
    } else if (result.type === 'cancel') {
      console.log('⚠️ User cancelled authentication');
      throw new Error('Google authentication was cancelled');
    } else {
      console.error('❌ Authentication failed. Result:', JSON.stringify(result, null, 2));
      throw new Error(`Google authentication failed. Type: ${result.type}`);
    }
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    // Provide more helpful error messages
    if (error.message.includes('not configured')) {
      throw error; // Re-throw configuration errors as-is
    }
    throw new Error(error.message || 'Failed to sign in with Google. Please try again.');
  }
};

/**
 * Send Google user info to backend for authentication
 */
export const authenticateWithGoogle = async (googleUser: GoogleUserInfo) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        googleId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Authentication failed');
    }

    const data = await response.json();
    
    // Store token and user in storage
    const { storage } = require('../utils/storage');
    if (data.token) {
      await storage.setToken(data.token);
    }
    if (data.user) {
      await storage.setUser(data.user);
    }
    
    return data;
  } catch (error: any) {
    console.error('Backend authentication error:', error);
    throw new Error(error.message || 'Failed to authenticate with backend');
  }
};

