'use strict';

// Postgres rows are snake_case; the mobile app speaks camelCase. These keep the JSON identical
// to what the old Lambdas returned.

const iso = (v) => (v ? new Date(v).toISOString() : null);

function toCat(row, photoUrl = null) {
  return {
    catId: row.cat_id,
    userId: row.user_id,
    name: row.name,
    age: row.age,
    sex: row.sex,
    adoptedDate: iso(row.adopted_date),
    weight: row.weight,
    breed: row.breed,
    color: row.color,
    microchipId: row.microchip_id,
    photoUrl,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

const logId = (catId, date) => `${catId}_${date}`;

function toLog(row) {
  const id = logId(row.cat_id, row.log_date);
  return {
    id,
    logId: id,
    catId: row.cat_id,
    userId: row.user_id,
    date: row.log_date,
    pooCount: row.poo_count,
    peeCount: row.pee_count,
    foodCount: row.food_count,
    waterCount: row.water_count,
    weight: row.weight,
    temperature: row.temperature,
    notes: row.notes,
    appetite: row.appetite,
    energy: row.energy,
    vomiting: row.vomiting,
    diarrhea: row.diarrhea,
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

module.exports = { toCat, toLog, toDisease, logId };
