import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL!;
const TOKEN_KEY = 'auth_token';

// Helper to get auth token
async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

export interface BreedPrediction {
  breed: string;
  confidence: number;
}

export interface BreedDetectionResult {
  breed: string;
  confidence: number;
  allPredictions: BreedPrediction[];
  fallback?: boolean;
  message?: string;
}

export const breedDetectionApi = {
  // Detect breed from base64 image
  detectBreed: async (base64Image: string): Promise<BreedDetectionResult> => {
    const token = await getAuthToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/detect-breed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ image: base64Image }),
    });

    console.log('Sending breed detection request with image size:', base64Image.length);
    console.log('Breed detection response:', response);

    const result = await response.json();

    if (!response.ok) {
      throw {
        code: result.code || 'BreedDetectionError',
        message: result.message || 'Failed to detect breed',
      };
    }

    return result;
  },
};