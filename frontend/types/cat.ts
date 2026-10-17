export type WeightUnit = 'kg' | 'lb';
export type CatSex = 'male' | 'female';

/** Body for creating a cat. Weight is always sent in kilograms; `weightUnit` is the display preference. */
export interface CatRequest {
  name: string;
  sex: CatSex;
  birthDate: string;            // YYYY-MM-DD
  birthDateEstimated?: boolean;
  adoptedDate: string;          // YYYY-MM-DD
  weight?: number | null;       // kg
  weightUnit?: WeightUnit;
  breed?: string | null;
  color?: string | null;
  microchipId?: string | null;  // digits only, 9–15
  photo?: string | null;        // local file URI; api/cats.ts converts it to base64
}

export type CatUpdate = Partial<CatRequest> & { catId: string };

export interface CatResponse {
  catId: string;
  userId: string;
  name: string;
  birthDate: string;            // YYYY-MM-DD
  birthDateEstimated: boolean;
  /** Whole years, derived from birthDate by the API. Prefer lib/cats.ts helpers for display. */
  age: number;
  sex: CatSex;
  adoptedDate: string;          // YYYY-MM-DD
  weight: number | null;        // kg
  weightUnit: WeightUnit;
  breed?: string | null;
  color?: string | null;
  microchipId?: string | null;
  photoUrl?: string | null;
  archivedAt: string | null;    // ISO timestamp when archived
  lastLogDate: string | null;   // YYYY-MM-DD of the latest log in the last 2 weeks
  attention: string | null;     // e.g. "Eating less", from the latest log
  createdAt: string;
  updatedAt: string;
}

export interface CatPhoto {
  photoId: string;
  catId: string;
  catName?: string; // present on "recent photos"
  url: string | null;
  takenOn: string;  // YYYY-MM-DD
  createdAt: string;
}
