// Cat Disease Seed Data
// Run this once to populate the diseases table

const diseases = [
  {
    name: "Feline Upper Respiratory Infection (URI)",
    category: "Respiratory",
    symptoms: [
      "Sneezing",
      "Nasal discharge",
      "Eye discharge",
      "Fever",
      "Loss of appetite",
      "Lethargy"
    ],
    description: "A common viral or bacterial infection affecting the nose, throat, and sinuses. Often called 'cat flu', it's highly contagious among cats and can be caused by feline herpesvirus or calicivirus.",
    prevention: [
      "Keep vaccinations up to date (FVRCP vaccine)",
      "Minimize stress",
      "Isolate infected cats from healthy cats",
      "Maintain good hygiene and clean living spaces",
      "Provide proper nutrition to support immune system"
    ],
    severity: "mild-moderate"
  },
  {
    name: "Feline Panleukopenia (Feline Distemper)",
    category: "Viral",
    symptoms: [
      "Severe vomiting",
      "Diarrhea (often bloody)",
      "Dehydration",
      "Fever",
      "Loss of appetite",
      "Depression",
      "Sudden death in kittens"
    ],
    description: "A highly contagious and often fatal viral disease caused by feline parvovirus. It attacks rapidly dividing cells, especially in the intestines, bone marrow, and developing fetuses.",
    prevention: [
      "Vaccinate kittens starting at 6-8 weeks",
      "Booster shots as recommended by vet",
      "Isolate infected cats",
      "Disinfect environment thoroughly (virus is very hardy)",
      "Avoid contact with infected cats or contaminated objects"
    ],
    severity: "severe"
  },
  {
    name: "Feline Leukemia Virus (FeLV)",
    category: "Viral",
    symptoms: [
      "Persistent infections",
      "Anemia",
      "Weight loss",
      "Enlarged lymph nodes",
      "Fever",
      "Difficulty breathing",
      "Poor coat condition"
    ],
    description: "A retrovirus that weakens the immune system and can lead to cancer. It's spread through close contact, grooming, sharing food/water bowls, and from mother to kittens.",
    prevention: [
      "Test all cats before bringing them home",
      "Vaccinate at-risk cats",
      "Keep cats indoors",
      "Separate infected cats from healthy cats",
      "Don't share food/water bowls between cats"
    ],
    severity: "severe"
  },
  {
    name: "Feline Immunodeficiency Virus (FIV)",
    category: "Viral",
    symptoms: [
      "Chronic infections",
      "Gingivitis",
      "Weight loss",
      "Poor coat condition",
      "Fever",
      "Diarrhea",
      "Eye problems"
    ],
    description: "A lentivirus similar to HIV in humans that weakens the immune system. Primarily spread through deep bite wounds from infected cats, making outdoor male cats most at risk.",
    prevention: [
      "Keep cats indoors",
      "Test all cats",
      "Spay/neuter to reduce fighting",
      "Separate FIV-positive cats from negative cats",
      "No vaccine currently available in most countries"
    ],
    severity: "severe"
  },
  {
    name: "Chronic Kidney Disease (CKD)",
    category: "Kidney",
    symptoms: [
      "Increased thirst",
      "Increased urination",
      "Weight loss",
      "Decreased appetite",
      "Vomiting",
      "Lethargy",
      "Poor coat quality"
    ],
    description: "Progressive deterioration of kidney function, common in older cats. The kidneys gradually lose their ability to filter waste from the blood and concentrate urine.",
    prevention: [
      "Provide fresh water always",
      "Feed high-quality, appropriate diet",
      "Regular veterinary check-ups (especially for senior cats)",
      "Maintain healthy weight",
      "Prompt treatment of kidney infections"
    ],
    severity: "moderate-severe"
  },
  {
    name: "Hyperthyroidism",
    category: "Endocrine",
    symptoms: [
      "Weight loss despite increased appetite",
      "Increased thirst and urination",
      "Hyperactivity",
      "Vomiting",
      "Diarrhea",
      "Poor coat condition",
      "Rapid heart rate"
    ],
    description: "Overproduction of thyroid hormones, usually caused by a benign tumor on the thyroid gland. Most common in cats over 10 years old.",
    prevention: [
      "Regular senior cat check-ups",
      "Monitor weight and eating habits",
      "Consider limited-iodine diets (consult vet)",
      "Early detection through blood tests"
    ],
    severity: "moderate"
  },
  {
    name: "Diabetes Mellitus",
    category: "Endocrine",
    symptoms: [
      "Increased thirst",
      "Increased urination",
      "Weight loss",
      "Increased appetite",
      "Lethargy",
      "Poor coat condition",
      "Weakness in hind legs"
    ],
    description: "A metabolic disorder where the body cannot properly use glucose due to insufficient insulin production or insulin resistance. More common in overweight, male, and older cats.",
    prevention: [
      "Maintain healthy weight",
      "Feed high-protein, low-carbohydrate diet",
      "Regular exercise",
      "Annual vet check-ups",
      "Monitor for early signs"
    ],
    severity: "moderate-severe"
  },
  {
    name: "Feline Lower Urinary Tract Disease (FLUTD)",
    category: "Urinary",
    symptoms: [
      "Straining to urinate",
      "Frequent urination",
      "Blood in urine",
      "Urinating outside litter box",
      "Licking genital area",
      "Crying while urinating",
      "Urinary blockage (emergency)"
    ],
    description: "A group of conditions affecting the bladder and urethra, including cystitis, urinary stones, and urethral blockages. Male cats are at higher risk for life-threatening blockages.",
    prevention: [
      "Provide fresh water always",
      "Feed wet food (increases water intake)",
      "Maintain healthy weight",
      "Reduce stress",
      "Keep litter box clean",
      "Multiple litter boxes in multi-cat homes"
    ],
    severity: "moderate-severe"
  },
  {
    name: "Inflammatory Bowel Disease (IBD)",
    category: "Gastrointestinal",
    symptoms: [
      "Chronic vomiting",
      "Diarrhea",
      "Weight loss",
      "Decreased appetite",
      "Lethargy",
      "Blood in stool"
    ],
    description: "Chronic inflammation of the gastrointestinal tract. The exact cause is unknown but may involve immune system dysfunction, food allergies, or bacterial imbalances.",
    prevention: [
      "Feed high-quality, easily digestible food",
      "Avoid sudden diet changes",
      "Minimize stress",
      "Regular parasite prevention",
      "Identify and avoid food allergens"
    ],
    severity: "moderate"
  },
  {
    name: "Dental Disease (Periodontal Disease)",
    category: "Dental",
    symptoms: [
      "Bad breath",
      "Red, swollen gums",
      "Difficulty eating",
      "Drooling",
      "Pawing at mouth",
      "Loose or missing teeth",
      "Bleeding gums"
    ],
    description: "Infection and inflammation of the gums and supporting structures of teeth. If untreated, bacteria can enter the bloodstream and affect other organs.",
    prevention: [
      "Daily tooth brushing",
      "Dental treats and toys",
      "Annual dental check-ups",
      "Professional cleanings as recommended",
      "Feed dental-friendly food"
    ],
    severity: "mild-moderate"
  },
  {
    name: "Feline Asthma",
    category: "Respiratory",
    symptoms: [
      "Coughing",
      "Wheezing",
      "Difficulty breathing",
      "Rapid breathing",
      "Open-mouth breathing",
      "Blue gums (severe cases)",
      "Lethargy"
    ],
    description: "Chronic inflammation of the airways causing them to narrow. Triggered by allergens like dust, pollen, smoke, or stress. Similar to human asthma.",
    prevention: [
      "Minimize exposure to smoke and aerosols",
      "Use dust-free litter",
      "Keep home clean and dust-free",
      "Use air purifiers",
      "Reduce stress",
      "Avoid strong fragrances"
    ],
    severity: "moderate-severe"
  },
  {
    name: "Ringworm (Dermatophytosis)",
    category: "Skin",
    symptoms: [
      "Circular patches of hair loss",
      "Scaly, crusty skin",
      "Itching",
      "Red skin lesions",
      "Brittle or broken hair",
      "Nail bed infections"
    ],
    description: "A highly contagious fungal infection affecting the skin, hair, and nails. Despite the name, it's caused by fungi, not worms. Can spread to humans and other pets.",
    prevention: [
      "Quarantine infected animals",
      "Disinfect environment thoroughly",
      "Good grooming practices",
      "Avoid contact with infected animals",
      "Clean and disinfect grooming tools"
    ],
    severity: "mild"
  },
  {
    name: "Ear Mites",
    category: "Parasitic",
    symptoms: [
      "Intense ear scratching",
      "Head shaking",
      "Dark, crumbly ear discharge",
      "Strong odor from ears",
      "Inflammation of ear canal",
      "Hair loss around ears"
    ],
    description: "Tiny parasites that live in the ear canal, feeding on ear wax and oils. Highly contagious among cats, especially kittens. Can cause secondary bacterial infections.",
    prevention: [
      "Regular ear cleaning",
      "Keep cats indoors",
      "Treat all pets in household if one is infected",
      "Regular vet check-ups",
      "Avoid contact with infected animals"
    ],
    severity: "mild"
  },
  {
    name: "Feline Infectious Peritonitis (FIP)",
    category: "Viral",
    symptoms: [
      "Fever",
      "Weight loss",
      "Lethargy",
      "Fluid accumulation in abdomen (wet form)",
      "Difficulty breathing",
      "Neurological signs",
      "Eye inflammation"
    ],
    description: "A fatal viral disease caused by a mutation of feline coronavirus. Occurs in two forms: wet (effusive) and dry (non-effusive). Most common in young cats and multi-cat environments.",
    prevention: [
      "Minimize stress",
      "Keep litter boxes very clean",
      "Limit number of cats in household",
      "Isolate infected cats",
      "Good nutrition to support immune system",
      "Note: Vaccine available but controversial effectiveness"
    ],
    severity: "severe"
  },
  {
    name: "Hypertrophic Cardiomyopathy (HCM)",
    category: "Cardiac",
    symptoms: [
      "Difficulty breathing",
      "Rapid breathing",
      "Lethargy",
      "Decreased appetite",
      "Sudden hind leg paralysis",
      "Heart murmur",
      "Sudden death (in some cases)"
    ],
    description: "The most common heart disease in cats, where the heart muscle thickens, reducing the heart's efficiency. Can be genetic, especially in breeds like Maine Coons and Ragdolls.",
    prevention: [
      "Genetic screening for at-risk breeds",
      "Regular vet check-ups with heart auscultation",
      "Maintain healthy weight",
      "Low-stress environment",
      "Early detection through echocardiogram"
    ],
    severity: "moderate-severe"
  },
  {
    name: "Feline Acne",
    category: "Skin",
    symptoms: [
      "Blackheads on chin",
      "Swollen chin",
      "Crusty lesions",
      "Bleeding sores",
      "Hair loss on chin",
      "Itching"
    ],
    description: "A common skin condition causing comedones (blackheads) on the chin and lips. Caused by poor grooming, stress, or reaction to plastic food bowls.",
    prevention: [
      "Use ceramic or stainless steel food bowls",
      "Keep chin area clean",
      "Replace food and water bowls regularly",
      "Reduce stress",
      "Regular grooming"
    ],
    severity: "mild"
  },
  {
    name: "Toxoplasmosis",
    category: "Parasitic",
    symptoms: [
      "Fever",
      "Lethargy",
      "Loss of appetite",
      "Difficulty breathing",
      "Eye inflammation",
      "Neurological signs",
      "Often asymptomatic in healthy cats"
    ],
    description: "A parasitic infection caused by Toxoplasma gondii. Cats are the definitive host. Most healthy cats show no symptoms. Important concern for pregnant women.",
    prevention: [
      "Keep cats indoors",
      "Don't feed raw meat",
      "Clean litter box daily (before parasites become infectious)",
      "Pregnant women should avoid litter box duties",
      "Wash hands after handling raw meat"
    ],
    severity: "mild-moderate"
  },
  {
    name: "Feline Stomatitis",
    category: "Dental",
    symptoms: [
      "Severe mouth pain",
      "Difficulty eating",
      "Drooling",
      "Bad breath",
      "Red, inflamed gums",
      "Weight loss",
      "Pawing at mouth"
    ],
    description: "Severe, painful inflammation of the mouth and gums. Often linked to immune system overreaction, possibly triggered by dental disease or viral infections like calicivirus.",
    prevention: [
      "Regular dental care",
      "Keep vaccinations current",
      "Minimize stress",
      "Regular vet check-ups",
      "Good nutrition"
    ],
    severity: "severe"
  },
  {
    name: "Feline Cognitive Dysfunction (FCD)",
    category: "Neurological",
    symptoms: [
      "Disorientation",
      "Changes in sleep patterns",
      "Decreased interaction with family",
      "House soiling",
      "Excessive vocalization",
      "Staring at walls",
      "Forgetting routines"
    ],
    description: "Age-related decline in cognitive function, similar to Alzheimer's in humans. Affects memory, learning, and awareness. Common in cats over 10 years old.",
    prevention: [
      "Mental stimulation (toys, puzzles)",
      "Regular play and interaction",
      "Maintain consistent routine",
      "Antioxidant-rich diet",
      "Omega-3 fatty acid supplements",
      "Regular vet check-ups"
    ],
    severity: "moderate"
  },
  {
    name: "Cancer (Various Types)",
    category: "Oncological",
    symptoms: [
      "Lumps or masses",
      "Weight loss",
      "Loss of appetite",
      "Difficulty eating or swallowing",
      "Persistent sores",
      "Abnormal bleeding",
      "Lethargy",
      "Varies by cancer type"
    ],
    description: "Uncontrolled cell growth that can occur in any part of the body. Common types include lymphoma, squamous cell carcinoma, and mammary tumors. More common in older cats.",
    prevention: [
      "Spay females before first heat (reduces mammary cancer)",
      "Minimize sun exposure for white cats",
      "Avoid environmental carcinogens (smoke)",
      "Maintain healthy weight",
      "Regular vet examinations",
      "Early detection through routine check-ups"
    ],
    severity: "severe"
  }
];

module.exports = { diseases };