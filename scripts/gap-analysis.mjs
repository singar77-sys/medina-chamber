import { readFileSync } from "fs";

const data = JSON.parse(readFileSync("./src/data/members.json", "utf8"));

// Mirror of TERM_EXPANSIONS from src/lib/chat-search.ts
const TERM_EXPANSIONS = {
  barbecue: ["restaurant","food"], bbq: ["restaurant","food","barbecue"],
  pizza: ["restaurant","food"], burger: ["restaurant","food"],
  sandwich: ["restaurant","food","deli"], coffee: ["cafe","coffee","restaurant","food"],
  breakfast: ["restaurant","food"], brunch: ["restaurant","food"],
  lunch: ["restaurant","food"], dinner: ["restaurant","food"],
  beer: ["brewery","bar","restaurant"], wine: ["winery","restaurant"],
  eat: ["restaurant","food"], dining: ["restaurant","food"],
  lawyer: ["attorney","attorneys","legal"], lawyers: ["attorney","attorneys","legal"],
  hvac: ["heating","cooling","air conditioning"],
  electrician: ["electrical","contractor"], electricians: ["electrical","contractor"],
  babysitter: ["child care","childcare","children"], nanny: ["child care","childcare","children"],
  vet: ["veterinary","animal"], veterinarian: ["veterinary","veterinarians"],
  gym: ["fitness","health","wellness"], workout: ["fitness","health","gym"],
  haircut: ["salon","barber","hair"], flowers: ["florist","floral"],
  movers: ["moving","relocation"],
};

function expandTerms(terms) {
  const out = new Set(terms);
  for (const t of terms) {
    const extras = TERM_EXPANSIONS[t];
    if (extras) extras.forEach(s => out.add(s));
  }
  return [...out];
}

function termMatches(haystack, term) {
  if (term.length <= 3) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`).test(haystack);
  }
  return haystack.includes(term);
}

function hitsForTerm(term) {
  const terms = expandTerms([term]);
  return data.members.filter((m) => {
    const name = m.name.toLowerCase();
    const cats = m.categories.map((c) => c.toLowerCase()).join(" ");
    const desc = m.description.toLowerCase();
    return terms.some(t => termMatches(name, t) || termMatches(cats, t) || termMatches(desc, t));
  }).length;
}

const tests = [
  // Colloquial profession names
  ["lawyer",        "Attorneys"],
  ["lawyers",       "Attorneys"],
  ["doctor",        "Physicians & Surgeons"],
  ["doctors",       "Physicians & Surgeons"],
  ["realtor",       "Real Estate"],
  ["hvac",          "Heating & Air Conditioning"],
  ["mechanic",      "Automobile Repairs & Service"],
  ["electrician",   "Contractors-Electrical"],
  ["daycare",       "Child Care"],
  ["babysitter",    "Child Care"],
  ["nanny",         "Child Care"],
  ["vet",           "Veterinary Clinic"],
  ["veterinarian",  "Veterinary Clinic"],
  ["website",       "Web Hosting & Development"],
  ["cpa",           "Accountants-CPA"],
  ["therapist",     "Counseling Service"],
  ["counselor",     "Counseling Service"],
  ["handyman",      "Home Improvement"],
  ["funeral",       "Funeral Homes"],
  ["pharmacy",      "Drug Store/Pharmacy"],
  ["florist",       "Florists"],           // ⚠ DATA GAP — no florist members exist
  ["photographer",  "Photography"],
  ["caterer",       "Caterers"],
  ["contractor",    "General Contractors"],
  ["grocery",       "Grocery"],
  // Things that should work
  ["plumber",       "Plumbing Contractor"],
  ["insurance",     "Insurance"],
  ["accountant",    "Accounting Service"],
  ["attorney",      "Attorneys"],
  ["restaurant",    "Restaurants"],
  ["bank",          "Banks & Banking"],
  ["marketing",     "Marketing Companies"],
  ["printing",      "Printers"],
  ["storage",       "Storage Facility"],
];

console.log("Term                  Hits  Expected category");
console.log("─".repeat(60));
for (const [term, expected] of tests) {
  const hits = hitsForTerm(term);
  const flag = hits === 0 ? "❌ ZERO" : `✓  ${hits}   `;
  console.log(`${flag}  ${term.padEnd(18)} → ${expected}`);
}
