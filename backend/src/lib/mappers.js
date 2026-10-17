// Postgres rows are snake_case; the mobile app speaks camelCase. These keep the JSON identical
// to what the old Lambdas returned.

const iso = (v) => (v ? new Date(v).toISOString() : null);

// A Postgres `date` arrives as 'YYYY-MM-DD'; keep it that way (no time zone shift). Older rows may be
// timestamps, so trim to the date part either way.
const dateOnly = (v) => (v ? String(v instanceof Date ? v.toISOString() : v).slice(0, 10) : null);

/** Whole years between a YYYY-MM-DD birthday and `today` (YYYY-MM-DD, defaults to UTC today). */
function ageInYears(birthDate, today = new Date().toISOString().slice(0, 10)) {
  if (!birthDate) return null;
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  let years = ty - by;
  if (tm < bm || (tm === bm && td < bd)) years -= 1;
  return Math.max(0, years);
}

/**
 * Turns a cat row into the JSON the app uses.
 * `extra` carries values that are not columns: { photoUrl, lastLogDate, attention }.
 */
function toCat(row, extra = {}) {
  const birthDate = dateOnly(row.birth_date);
  return {
    catId: row.cat_id,
    userId: row.user_id,
    name: row.name,
    birthDate,
    birthDateEstimated: Boolean(row.birth_date_estimated),
    age: ageInYears(birthDate), // derived; kept for screens that still read it
    sex: row.sex,
    adoptedDate: dateOnly(row.adopted_date),
    weight: row.weight,          // kilograms
    weightUnit: row.weight_unit ?? 'kg',
    breed: row.breed,
    color: row.color,
    microchipId: row.microchip_id,
    photoUrl: extra.photoUrl ?? null,
    archivedAt: iso(row.archived_at),
    lastLogDate: extra.lastLogDate ?? null,
    attention: extra.attention ?? null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function toPhoto(row, url, catName) {
  return {
    photoId: row.photo_id,
    catId: row.cat_id,
    ...(catName !== undefined ? { catName } : {}),
    url: url ?? null,
    takenOn: dateOnly(row.taken_on),
    createdAt: iso(row.created_at),
  };
}

const logId = (catId, date) => `${catId}_${date}`;

const num = (v) => (v == null ? null : Number(v));
const hasSymptom = (symptoms, name) => symptoms.some((x) => x.name?.toLowerCase() === name);

function toLog(row) {
  const id = logId(row.cat_id, dateOnly(row.log_date));
  const symptoms = Array.isArray(row.symptoms) ? row.symptoms : [];
  const foodAmount = num(row.food_amount);
  const waterAmount = num(row.water_amount);
  return {
    id,
    logId: id,
    catId: row.cat_id,
    userId: row.user_id,
    date: dateOnly(row.log_date),
    // daily essentials
    foodAmount,
    foodUnit: row.food_unit ?? null,
    waterAmount,
    waterUnit: row.water_unit ?? null,
    pooCount: row.poo_count ?? 0,
    peeCount: row.pee_count ?? 0,
    complete: foodAmount != null && waterAmount != null,
    // optional
    symptoms,
    teethBrushed: row.teeth_brushed ?? null,
    medications: Array.isArray(row.medications) ? row.medications : [],
    weight: row.weight,
    temperature: row.temperature,
    notes: row.notes,
    // derived / legacy, still read by analytics and older screens
    vomiting: hasSymptom(symptoms, 'vomiting') || Boolean(row.vomiting),
    diarrhea: hasSymptom(symptoms, 'diarrhea') || Boolean(row.diarrhea),
    appetite: row.appetite ?? null,
    energy: row.energy ?? null,
    foodCount: row.food_count ?? 0,
    waterCount: row.water_count ?? 0,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function toDisease(row) {
  return {
    id: row.disease_id,
    diseaseId: row.disease_id,
    name: row.name,
    category: row.category,
    symptoms: row.symptoms ?? [],
    description: row.description,
    prevention: row.prevention ?? [],
    severity: row.severity,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export { toCat, toPhoto, toLog, toDisease, logId, ageInYears, dateOnly };
