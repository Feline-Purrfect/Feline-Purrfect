export type FoodUnit = 'g' | 'cups' | 'portions';
export type WaterUnit = 'ml' | 'bowls';
export type DoseUnit = 'mg' | 'ml' | 'pill';

export interface Symptom {
  name: string;
  count: number; // ≥ 1; shown as "Vomiting ×2" when > 1
}

export interface Medication {
  name: string;
  dose?: number | null;
  unit: DoseUnit;
}

/** Body for saving a cat's day. Posting the same cat + date again replaces it. */
export interface LogRequest {
  catId: string;
  date: string; // YYYY-MM-DD
  foodAmount?: number | null;
  foodUnit?: FoodUnit | null;
  waterAmount?: number | null;
  waterUnit?: WaterUnit | null;
  pooCount?: number;
  peeCount?: number;
  symptoms?: Symptom[];
  teethBrushed?: boolean | null;
  medications?: Medication[];
  weight?: number | null;      // kg
  temperature?: number | null; // °C
  notes?: string | null;
}

export type LogUpdate = Omit<Partial<LogRequest>, 'catId' | 'date'> & { id: string };

export interface LogResponse {
  id: string; // `${catId}_${date}`
  catId: string;
  userId: string;
  date: string;
  foodAmount: number | null;
  foodUnit: FoodUnit | null;
  waterAmount: number | null;
  waterUnit: WaterUnit | null;
  pooCount: number;
  peeCount: number;
  /** Food and water filled in. A log can exist with only a symptom noted. */
  complete: boolean;
  symptoms: Symptom[];
  teethBrushed: boolean | null;
  medications: Medication[];
  weight: number | null;
  temperature: number | null;
  notes: string | null;
  // derived / legacy
  vomiting: boolean;
  diarrhea: boolean;
  appetite: number | null;
  energy: number | null;
  foodCount: number;
  waterCount: number;
  createdAt: string;
  updatedAt: string;
}
