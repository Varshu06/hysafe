import { useRef, useState } from 'react';
import { TurboModuleRegistry } from 'react-native';
import { GoogleSignInButton } from './GoogleSignInButton';
import { GoogleCredential } from '../../services/googleAuth.service';
import { GOOGLE_WEB_CLIENT_ID } from '../../utils/constants';
import { androidGoogleSignInRequest } from '../../utils/googleOAuth';

type AndroidGoogleAuthProps = {
  label: string;
  disabled?: boolean;
  onCredential: (credential: GoogleCredential) => Promise<void>;
  onCancel: () => void;
  onError: (message: string) => void;
  onBusyChange?: (busy: boolean) => void;
};

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

const signInRequest = androidGoogleSignInRequest(GOOGLE_WEB_CLIENT_ID);
const unavailableMessage = 'Google sign-in is not available in this Android build yet.';

const loadGoogleSignIn = (): GoogleSignInModule | null => {
  if (TurboModuleRegistry.get('RNGoogleSignin') == null) return null;
  try {
    return require('@react-native-google-signin/google-signin') as GoogleSignInModule;
  } catch {
    return null;
  }
};

export function AndroidGoogleAuth({
  label,
  disabled,
  onCredential,
  onCancel,
  onError,
  onBusyChange,
}: AndroidGoogleAuthProps) {
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const onCredentialRef = useRef(onCredential);
  const onCancelRef = useRef(onCancel);
  const onErrorRef = useRef(onError);
  const onBusyChangeRef = useRef(onBusyChange);
  onCredentialRef.current = onCredential;
  onCancelRef.current = onCancel;
  onErrorRef.current = onError;
  onBusyChangeRef.current = onBusyChange;

  const setBusyState = (next: boolean) => {
    setBusy(next);
    onBusyChangeRef.current?.(next);
  };

  return (
    <GoogleSignInButton
      label={label}
      disabled={disabled || busy}
      loading={busy}
      onPress={() => {
        if (!signInRequest) {
          onErrorRef.current('Google sign-in is not configured.');
          return;
        }
        if (busy || disabled || submitting.current) return;
        const google = loadGoogleSignIn();
        if (!google) {
          onErrorRef.current(unavailableMessage);
          return;
        }
        submitting.current = true;
        setBusyState(true);
        google.GoogleSignin.configure({
          webClientId: signInRequest.webClientId,
          offlineAccess: signInRequest.offlineAccess,
          scopes: [...signInRequest.scopes],
        });
        void google.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
          .then(() => google.GoogleSignin.signIn())
          .then(async (result) => {
            if (result.type === 'cancelled') {
              onCancelRef.current();
              return;
            }
            const idToken = result.data.idToken;
            if (!idToken) {
              onErrorRef.current('Google sign-in could not be completed. Please try again.');
              return;
            }
            await onCredentialRef.current({ idToken });
          })
          .catch((error: unknown) => {
            if (google.isErrorWithCode(error) && error.code === google.statusCodes.SIGN_IN_CANCELLED) {
              onCancelRef.current();
              return;
            }
            if (google.isErrorWithCode(error) && error.code === google.statusCodes.IN_PROGRESS) return;
            const missingNativeModule = error instanceof Error && error.message.includes('RNGoogleSignin');
            onErrorRef.current(missingNativeModule
              ? unavailableMessage
              : 'Google sign-in could not be completed. Please try again.');
          })
          .finally(() => {
            submitting.current = false;
            setBusyState(false);
          });
      }}
    />
  );
}
