/**
 * Debug: Simulate local fallback search for Malang
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

async function check() {
  const malangLat = -7.9666;
  const malangLng = 112.6326;
  const radiusKm = 25;

  const { data, error } = await supabase
    .from('institutions')
    .select('id, name, slug, type, city, location, cover_image_url')
    .eq('is_verified', true);

  if (error || !data) {
    console.error('Error:', error?.message);
    return;
  }

  console.log('Total verified institutions:', data.length);

  let parsedCount = 0;
  let withinRange = 0;
  let failedParse = 0;
  const withinRangePlaces: string[] = [];

  for (const m of data) {
    let latitude = 0, longitude = 0;
    if (m.location) {
      if (typeof m.location === 'object' && (m.location as any).coordinates) {
        [longitude, latitude] = (m.location as any).coordinates;
      } else if (typeof m.location === 'string') {
        if (/^[0-9a-fA-F]+$/.test(m.location)) {
          try {
            const buf = Buffer.from(m.location, 'hex');
            if (buf.length >= 21) {
              const byteOrder = buf.readUInt8(0);
              const isLittleEndian = byteOrder === 1;
              const geomType = isLittleEndian ? buf.readUInt32LE(1) : buf.readUInt32BE(1);
              const hasSrid = (geomType & 0x20000000) !== 0;
              const offset = hasSrid ? 9 : 5;
              if (buf.length >= offset + 16) {
                longitude = isLittleEndian ? buf.readDoubleLE(offset) : buf.readDoubleBE(offset);
                latitude = isLittleEndian ? buf.readDoubleLE(offset + 8) : buf.readDoubleBE(offset + 8);
              }
            }
          } catch {}
        } else {
          const match = m.location.match(/POINT\(([^ ]+)\s+([^)]+)\)/);
          if (match) {
            longitude = parseFloat(match[1]);
            latitude = parseFloat(match[2]);
          }
        }
      }
    }

    if (latitude !== 0 && longitude !== 0) {
      parsedCount++;
      const dist = haversine(malangLat, malangLng, latitude, longitude);
      if (dist <= radiusKm) {
        withinRange++;
        withinRangePlaces.push(`  [${m.type}] ${m.name} (${m.slug}) - ${dist.toFixed(1)}km - cover: ${m.cover_image_url ? 'YES' : 'NO'}`);
      }
    } else {
      failedParse++;
      if (m.city && (m.city.includes('Malang') || m.city.includes('Batu'))) {
        console.log('FAILED PARSE:', m.name, '| slug:', m.slug);
      }
    }
  }

  console.log('\nParsed locations:', parsedCount);
  console.log('Failed to parse:', failedParse);
  console.log('Within 25km of Malang center:', withinRange);
  console.log('\nPlaces within range:');
  for (const p of withinRangePlaces.sort()) {
    console.log(p);
  }
}

check();
