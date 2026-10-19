import { Colors } from '@/constants/colors';
import { API_URL } from '@/lib/api/client';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';

// The Terms of Use and Privacy Policy are web pages served by the API (backend/legal/), so the app,
// the App Store and Google Play all point at the same text.
export const LEGAL_URLS = {
  terms: `${API_URL}/legal/terms`,
  privacy: `${API_URL}/legal/privacy`,
} as const;

export type LegalDoc = keyof typeof LEGAL_URLS;

/** Opens the page in an in-app browser sheet. */
export async function openLegal(doc: LegalDoc) {
  try {
    await WebBrowser.openBrowserAsync(LEGAL_URLS[doc], {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: Colors.primary.DEFAULT,
      toolbarColor: Colors.canvas,
    });
  } catch {
    Alert.alert(
      'Couldn’t open the page',
      'Check your connection and try again.',
    );
  }
}
