import { apiFetch } from '@/lib/api/client';
import { CatRequest, CatResponse } from '@/types/cat';
import { File } from 'expo-file-system';

async function imageUriToBase64(uri: string): Promise<string> {
  try {
    const file = new File(uri);
    const base64 = await file.base64();
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error('Failed to convert image to base64:', error);
    throw new Error('Failed to process image');
  }
}

const catBody = (cat: CatRequest | CatResponse, photo?: string) => ({
  name: cat.name,
  age: cat.age,
  sex: cat.sex,
  adoptedDate: cat.adoptedDate,
  weight: cat.weight,
  breed: cat.breed,
  color: cat.color,
  microchipId: cat.microchipId,
  photo,
});

export const catsApi = {
  getCats: async (): Promise<CatResponse[]> => {
    const result = await apiFetch<{ cats?: CatResponse[] }>('/cats', {
      fallbackCode: 'GetCatsError',
      fallbackMessage: 'Failed to fetch cats',
    });
    return result.cats || [];
  },

  addCat: async (cat: CatRequest): Promise<CatResponse> => {
    const photo = cat.photo ? await imageUriToBase64(cat.photo) : undefined;
    const result = await apiFetch<{ cat: CatResponse }>('/cats', {
      method: 'POST',
      body: catBody(cat, photo),
      fallbackCode: 'AddCatError',
      fallbackMessage: 'Failed to add cat',
    });
    return result.cat;
  },

  updateCat: async (cat: CatResponse & { photo?: string }): Promise<CatResponse> => {
    // Only upload a new local image; a remote URL means "unchanged".
    const photo = cat.photo && !cat.photo.startsWith('http') ? await imageUriToBase64(cat.photo) : undefined;
    const result = await apiFetch<{ cat: CatResponse }>(`/cats/${cat.catId}`, {
      method: 'PUT',
      body: catBody(cat, photo),
      fallbackCode: 'UpdateCatError',
      fallbackMessage: 'Failed to update cat',
    });
    return result.cat;
  },

  deleteCat: async (catId: string): Promise<void> => {
    await apiFetch(`/cats/${catId}`, {
      method: 'DELETE',
      fallbackCode: 'DeleteCatError',
      fallbackMessage: 'Failed to delete cat',
    });
  },

  getCat: async (catId: string): Promise<CatResponse> => {
    const result = await apiFetch<{ cat: CatResponse }>(`/cats/${catId}`, {
      fallbackCode: 'GetCatError',
      fallbackMessage: 'Failed to fetch cat',
    });
    return result.cat;
  },
};
