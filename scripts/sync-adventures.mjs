/**
 * sync-adventures.mjs — Airtable → Supabase adventure sync.
 *
 * Source of truth: Airtable "LMA Super-App Build" (base appgqANR6zpOnSSp2).
 *   • Learners  — the CURRENT adventure snapshot (number / start / length / status / language).
 *   • Programs  — the per-adventure LEDGER; completed Programs for a learner become `history`.
 *
 * Writes the resolved shape into Supabase `users.adventure` (jsonb):
 *   { number, startDate, endDate, totalDays, status, languageFrom, languageTo, history[] }
 *
 * Run:  node scripts/sync-adventures.mjs           (writes)
 *       node scripts/sync-adventures.mjs --dry-run  (prints, no writes)
 *
 * Env (scripts/.env): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AIRTABLE_API_KEY.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '.env') });

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AIRTABLE_API_KEY } = process.env;
const BASE_ID = process.env.AIRTABLE_BASE_ID ?? 'appgqANR6zpOnSSp2';
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !AIRTABLE_API_KEY) {
  console.error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or AIRTABLE_API_KEY in scripts/.env');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

/** Pull every record from an Airtable table, following pagination. */
async function airtable(table) {
  const out = [];
  let offset;
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(table)}`);
    url.searchParams.set('pageSize', '100');
    if (offset) url.searchParams.set('offset', offset);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } });
    if (!res.ok) throw new Error(`Airtable ${table} ${res.status}: ${await res.text()}`);
    const json = await res.json();
    out.push(...json.records);
    offset = json.offset;
  } while (offset);
  return out;
}

const titleCase = (s) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);

/** Map an Airtable status string to an AdventurePhase, or undefined to let the app derive. */
function mapPhase(raw) {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('complet') || s.includes('finish') || s.includes('done')) return 'completed';
  if (s.includes('paus') || s.includes('hold')) return 'paused';
  if (s.includes('active') || s.includes('live') || s.includes('progress')) return 'active';
  if (s.includes('draft') || s.includes('upcoming') || s.includes('scheduled')) return 'upcoming';
  return undefined;
}

/** End date = start + (totalDays - 1) so the final day reads "Day M of M". */
function deriveEnd(startISO, totalDays) {
  if (!startISO || !totalDays) return undefined;
  const d = new Date(`${startISO}T00:00:00`);
  d.setDate(d.getDate() + totalDays - 1);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const [learners, programs] = await Promise.all([airtable('Learners'), airtable('Programs')]);

  // Index programs by linked learner record id.
  const programsByLearner = new Map();
  for (const p of programs) {
    const f = p.fields;
    for (const link of f['Learner'] ?? []) {
      const lid = typeof link === 'string' ? link : link.id;
      if (!programsByLearner.has(lid)) programsByLearner.set(lid, []);
      programsByLearner.get(lid).push(p);
    }
  }

  let written = 0;
  for (const lr of learners) {
    const f = lr.fields;
    const userId = f['Supabase user id'];
    if (!userId) continue;

    const number = f['Adventure number'] ?? 1;
    const startDate = f['Adventure start'] || undefined;
    const totalDays = f['Adventure length (days)'] || undefined;
    const languageTo = titleCase(f['Target language']) || undefined;

    const myPrograms = programsByLearner.get(lr.id) ?? [];
    // Current = program matching the current adventure number, else the most recent.
    const current =
      myPrograms.find((p) => (p.fields['Adventure number'] ?? 1) === number) ??
      myPrograms.slice().sort((a, b) => (b.fields['Start date'] ?? '').localeCompare(a.fields['Start date'] ?? ''))[0];

    const languageFrom = titleCase(current?.fields['Source language']) || 'English';
    const explicitPhase = mapPhase(current?.fields['Status']) ?? mapPhase(f['Status']);
    const endDate = current?.fields['End date'] || deriveEnd(startDate, totalDays);

    // History = completed programs from earlier adventure numbers.
    const history = myPrograms
      .filter((p) => mapPhase(p.fields['Status']) === 'completed' && (p.fields['Adventure number'] ?? 0) < number)
      .sort((a, b) => (a.fields['Adventure number'] ?? 0) - (b.fields['Adventure number'] ?? 0))
      .map((p) => ({
        number: p.fields['Adventure number'] ?? 0,
        startDate: p.fields['Start date'] || undefined,
        endDate: p.fields['End date'] || undefined,
        languageTo: titleCase(p.fields['Language']) || undefined,
        status: 'completed',
      }));

    const adventure = {
      number,
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(totalDays && { totalDays }),
      ...(explicitPhase && { status: explicitPhase }),
      ...(languageFrom && { languageFrom }),
      ...(languageTo && { languageTo }),
      ...(history.length && { history }),
    };

    console.log(`${f['Name']} (${userId}):`, JSON.stringify(adventure));
    if (!DRY_RUN) {
      const { error } = await admin.from('users').update({ adventure }).eq('id', userId);
      if (error) console.error(`  ✗ ${userId}: ${error.message}`);
      else written++;
    }
  }
  console.log(DRY_RUN ? '\nDry run — no writes.' : `\nSynced ${written} learner(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
