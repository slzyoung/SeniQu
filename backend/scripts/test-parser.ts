import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function parseWKB(wkbHex: string): { latitude: number; longitude: number } {
    let latitude = 0;
    let longitude = 0;
    try {
        const buf = Buffer.from(wkbHex, 'hex');
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
    } catch (e: any) {
        console.error('Failed to parse:', e.message);
    }
    return { latitude, longitude };
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function check() {
    const names = [
        'Hutan Mangrove Wonorejo', 'Kenjeran Park', 'Taman Harmoni', 
        'Ciputra Waterpark', 'Graha Natura Park', 'Vin Autism Gallery',
        'House of Sampoerna', 'Jembatan Merah', 'Surabaya North Quay', 'Jembatan Suramadu'
    ];

    const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .in('name', names);

    if (error || !data) {
        console.error(error);
        return;
    }

    const centerLat = -7.2575;
    const centerLng = 112.7521;
    const radiusKm = 35;

    console.log('Parsed details for new places:');
    data.forEach(x => {
        const { latitude, longitude } = parseWKB(x.location);
        const dist = haversineDistance(centerLat, centerLng, latitude, longitude);
        console.log(`- Name: ${x.name}\n  Parsed Lat: ${latitude}, Lng: ${longitude}\n  Distance to center: ${dist.toFixed(2)} km (Matches: ${dist <= radiusKm})`);
    });
}

check();
