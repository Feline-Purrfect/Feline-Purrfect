import { apiFetch } from '@/lib/api/client';
import { prepareImageForUpload } from '@/lib/images';
import { CatPhoto, CatRequest, CatResponse, CatUpdate } from '@/types/cat';

/** Resized and re-encoded on the phone first (see lib/images.ts): a few hundred KB instead of several MB. */
async function imageUriToBase64(uri: string): Promise<string> {
  try {
    return await prepareImageForUpload(uri);
  } catch (error) {
    console.error('Failed to prepare image for upload:', error);
    throw new Error('Could not read that photo. Try choosing it again.');
  }
}

/** Only local images are uploaded; a remote URL means "photo unchanged". */
const photoPayload = async (photo?: string | null) =>
  photo && !photo.startsWith('http') ? imageUriToBase64(photo) : undefined;

export const catsApi = {
  /** Active cats by default; `archived: true` for the archive. */
  getCats: async ({ archived = false } = {}): Promise<CatResponse[]> => {
    const result = await apiFetch<{ cats?: CatResponse[] }>(
      archived ? '/cats?archived=true' : '/cats',
      {
        fallbackCode: 'GetCatsError',
        fallbackMessage: 'Couldn’t load your cats',
      },
    );
    return result.cats || [];
  },

  getCat: async (catId: string): Promise<CatResponse> => {
    const result = await apiFetch<{ cat: CatResponse }>(`/cats/${catId}`, {
      fallbackCode: 'GetCatError',
      fallbackMessage: 'Couldn’t load this cat',
    });
    return result.cat;
  },

  addCat: async (cat: CatRequest): Promise<CatResponse> => {
    const { photo, ...rest } = cat;
    const result = await apiFetch<{ cat: CatResponse }>('/cats', {
      method: 'POST',
      body: { ...rest, photo: await photoPayload(photo) },
      fallbackCode: 'AddCatError',
      fallbackMessage: 'Couldn’t add this cat',
    });
    return result.cat;
  },

  /** Partial update: only the fields present are changed. */
  updateCat: async ({
    catId,
    photo,
    ...rest
  }: CatUpdate): Promise<CatResponse> => {
    const result = await apiFetch<{ cat: CatResponse }>(`/cats/${catId}`, {
      method: 'PUT',
      body: { ...rest, photo: await photoPayload(photo) },
      fallbackCode: 'UpdateCatError',
      fallbackMessage: 'Couldn’t save your changes',
    });
    return result.cat;
  },

  archiveCat: async (catId: string): Promise<CatResponse> =>
    (
      await apiFetch<{ cat: CatResponse }>(`/cats/${catId}/archive`, {
        method: 'POST',
        fallbackCode: 'ArchiveCatError',
        fallbackMessage: 'Couldn’t archive this cat',
      })
    ).cat,

  unarchiveCat: async (catId: string): Promise<CatResponse> =>
    (
      await apiFetch<{ cat: CatResponse }>(`/cats/${catId}/unarchive`, {
        method: 'POST',
        fallbackCode: 'UnarchiveCatError',
        fallbackMessage: 'Couldn’t restore this cat',
      })
    ).cat,

  /** Permanent: removes the cat, its logs and photos. */
  deleteCat: async (catId: string): Promise<void> => {
    await apiFetch(`/cats/${catId}`, {
      method: 'DELETE',
      fallbackCode: 'DeleteCatError',
      fallbackMessage: 'Couldn’t delete this cat',
    });
  },

  // ------------------------------------------------------------ photo gallery
  /** Newest first. `on` (YYYY-MM-DD) limits to one day, for that day's log. */
  getCatPhotos: async (
    catId: string,
    {
      limit = 60,
      offset = 0,
      on,
    }: { limit?: number; offset?: number; on?: string } = {},
  ): Promise<{ photos: CatPhoto[]; total: number }> =>
    apiFetch(
      `/cats/${catId}/photos?limit=${limit}&offset=${offset}${on ? `&on=${on}` : ''}`,
      {
        fallbackCode: 'GetPhotosError',
        fallbackMessage: 'Couldn’t load photos',
      },
    ),

  /** Every cat's photos taken between two dates (inclusive, at most two months): one call for a week of day cards. */
  getPhotosInRange: async (from: string, to: string): Promise<CatPhoto[]> =>
    (
      await apiFetch<{ photos: CatPhoto[] }>(
        `/cats/photos?from=${from}&to=${to}`,
        {
          fallbackCode: 'GetPhotosError',
          fallbackMessage: 'Couldn’t load photos',
        },
      )
    ).photos,

  getRecentPhotos: async (limit = 3): Promise<CatPhoto[]> =>
    (
      await apiFetch<{ photos: CatPhoto[] }>(
        `/cats/photos/recent?limit=${limit}`,
        {
          fallbackCode: 'GetPhotosError',
          fallbackMessage: 'Couldn’t load photos',
        },
      )
    ).photos,

  addCatPhoto: async ({
    catId,
    uri,
    takenOn,
  }: {
    catId: string;
    uri: string;
    takenOn?: string;
  }): Promise<CatPhoto> =>
    (
      await apiFetch<{ photo: CatPhoto }>(`/cats/${catId}/photos`, {
        method: 'POST',
        body: { photo: await imageUriToBase64(uri), takenOn },
        fallbackCode: 'AddPhotoError',
        fallbackMessage: 'Couldn’t upload that photo',
      })
    ).photo,

  deleteCatPhoto: async ({
    catId,
    photoId,
  }: {
    catId: string;
    photoId: string;
  }): Promise<void> => {
    await apiFetch(`/cats/${catId}/photos/${photoId}`, {
      method: 'DELETE',
      fallbackCode: 'DeletePhotoError',
      fallbackMessage: 'Couldn’t delete that photo',
    });
  },
};
