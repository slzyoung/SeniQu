import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function resolveDuplicates() {
    console.log('Resolving duplicates for Graha Natura Park & Surabaya North Quay...');

    // 1. Graha Natura Park
    const { data: naturaList, error: errorN } = await supabase
        .from('institutions')
        .select('id, name, slug, cover_image_url')
        .ilike('name', '%Graha Natura Park%');

    if (errorN) {
        console.error('Error fetching Graha Natura Park:', errorN);
    } else if (naturaList && naturaList.length > 1) {
        console.log(`Found ${naturaList.length} rows for Graha Natura Park.`);
        // Keep the first one, delete the rest
        const keepId = naturaList[0].id;
        const deleteIds = naturaList.slice(1).map(x => x.id);
        
        console.log(`Keeping ID: ${keepId}, deleting IDs: ${deleteIds.join(', ')}`);
        
        // Delete dependent reviews/artworks if any (cascade or delete explicitly)
        // For safe cleanup:
        const { error: delErr } = await supabase
            .from('institutions')
            .delete()
            .in('id', deleteIds);
            
        if (delErr) {
            console.error('Failed to delete duplicates:', delErr);
        } else {
            console.log('Successfully deleted duplicates.');
        }

        // Update the kept one
        const { error: updErr } = await supabase
            .from('institutions')
            .update({
                cover_image_url: 'https://cdn.seniqu.art/museums/images/graha-natura-park.png',
                city: 'Surabaya',
                province: 'Jawa Timur',
                is_verified: true,
                rating: 4.8,
                location: 'POINT(112.6671 -7.2755)',
                owner_id: '8153fce9-d95b-484b-88ce-156491540645',
                slug: 'graha-natura-park-heritage'
            })
            .eq('id', keepId);
            
        if (updErr) {
            console.error('Failed to update kept Graha Natura Park:', updErr);
        } else {
            console.log('Updated kept Graha Natura Park successfully.');
        }
    }

    // 2. Surabaya North Quay
    const { data: quayList, error: errorQ } = await supabase
        .from('institutions')
        .select('id, name, slug, cover_image_url')
        .ilike('name', '%Surabaya North Quay%');

    if (errorQ) {
        console.error('Error fetching Surabaya North Quay:', errorQ);
    } else if (quayList && quayList.length > 1) {
        console.log(`Found ${quayList.length} rows for Surabaya North Quay.`);
        const keepId = quayList[0].id;
        const deleteIds = quayList.slice(1).map(x => x.id);
        
        console.log(`Keeping ID: ${keepId}, deleting IDs: ${deleteIds.join(', ')}`);
        
        const { error: delErr } = await supabase
            .from('institutions')
            .delete()
            .in('id', deleteIds);
            
        if (delErr) {
            console.error('Failed to delete duplicates:', delErr);
        } else {
            console.log('Successfully deleted duplicates.');
        }

        const { error: updErr } = await supabase
            .from('institutions')
            .update({
                cover_image_url: 'https://cdn.seniqu.art/museums/images/surabaya-north-quay.png',
                city: 'Surabaya',
                province: 'Jawa Timur',
                is_verified: true,
                rating: 4.8,
                location: 'POINT(112.7322 -7.1969)',
                owner_id: '8153fce9-d95b-484b-88ce-156491540645',
                slug: 'surabaya-north-quay-maritime'
            })
            .eq('id', keepId);
            
        if (updErr) {
            console.error('Failed to update kept Surabaya North Quay:', updErr);
        } else {
            console.log('Updated kept Surabaya North Quay successfully.');
        }
    }

    console.log('🎉 Duplicates resolution complete!');
}

resolveDuplicates();
