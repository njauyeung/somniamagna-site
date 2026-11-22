// Builds admin/cities-all.js (the admin-only city picker list) from the GeoNames-based `all-the-cities` package.
// Run:  npm i --no-save all-the-cities && node scripts/build-cities.mjs
// Cut-offs: world 30k+, Canada 5k+, US 20k+, UK/Australia 15k+. Sorted biggest first so the picker offers big cities first.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const cities = createRequire(import.meta.url)('all-the-cities');
const CA = { '01': 'AB', '02': 'BC', '03': 'MB', '04': 'NB', '05': 'NL', '07': 'NS', '08': 'ON', '09': 'PE', '10': 'QC', '11': 'SK', '12': 'YT', '13': 'NT', '14': 'NU' };
const names = new Intl.DisplayNames(['en'], { type: 'region' });
const min = (c) => ({ CA: 5000, US: 20000, GB: 15000, AU: 15000 }[c] || 30000);
// GeoNames lists a few municipalities as districts rather than towns, so add them by hand: [name, region, lon, lat, rough population]
const EXTRA = [['Whitby', 'ON', -78.943, 43.898, 138000], ['Stouffville', 'ON', -79.244, 43.97, 49000], ['Clarington', 'ON', -78.687, 43.913, 101000], ['Bowmanville', 'ON', -78.687, 43.913, 40000], ['Caledon', 'ON', -79.867, 43.867, 76000], ['Halton Hills', 'ON', -79.918, 43.629, 62000]]
  .map(([name, region, lon, lat, population]) => ({ name, region, loc: { coordinates: [lon, lat] }, population, country: 'XX', featureCode: 'PPL' }));
const rows = cities.concat(EXTRA)
  .filter((c) => c.population >= min(c.country) && c.loc && /^PPL/.test(c.featureCode))
  .sort((a, b) => b.population - a.population)
  .map((c) => {
    const region = c.region || (c.country === 'CA' ? (CA[c.adminCode] || 'Canada') : c.country === 'US' ? (c.adminCode || 'USA') : names.of(c.country));
    return [c.name, region, +c.loc.coordinates[0].toFixed(3), +c.loc.coordinates[1].toFixed(3)];
  });
const seen = new Set();
const out = rows.filter((r) => { const k = r.join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
writeFileSync(new URL('../admin/cities-all.js', import.meta.url), '/* Admin-only city list: [name, province/state/country, lon, lat], biggest first. Rebuild with scripts/build-cities.mjs */\nwindow.SM_CITIES_ALL = ' + JSON.stringify(out) + ';\n');
console.log(out.length, 'cities');
