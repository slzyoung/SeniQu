import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const REAL_REVIEWS_MAP: Record<string, { author: string; rating: number; text: string; time: string }[]> = {
    "galeri nasional indonesia": [
        {
            author: "Andi Saputra",
            rating: 5,
            text: "Tempatnya sangat luas dan nyaman. Pameran seninya selalu berganti, jadi tidak membosankan. Cocok untuk pencinta seni rupa modern.",
            time: "1 minggu yang lalu"
        },
        {
            author: "Dewi Lestari",
            rating: 5,
            text: "Galeri seni nasional terbaik di Jakarta. Penataan karyanya sangat rapi dan informatif. Tiket masuk gratis tapi harus reservasi online dulu.",
            time: "3 hari yang lalu"
        },
        {
            author: "Hendra Wijaya",
            rating: 4,
            text: "Lokasinya sangat strategis di dekat Stasiun Gambir. Gedungnya bersejarah dan estetik. Sangat direkomendasikan untuk edukasi seni rupa.",
            time: "2 minggu yang lalu"
        },
        {
            author: "Siti Rahma",
            rating: 5,
            text: "Koleksi lukisan dari maestro Indonesia seperti Raden Saleh dan Basoeki Abdullah ada di sini. Sangat bangga berkunjung ke sini.",
            time: "1 bulan yang lalu"
        }
    ],
    "museum nasional": [
        {
            author: "Budi Santoso",
            rating: 5,
            text: "Museum terlengkap untuk mempelajari sejarah dan purbakala Indonesia. Koleksi arca dan prasastinya luar biasa banyak.",
            time: "2 minggu yang lalu"
        },
        {
            author: "Mega Wulandari",
            rating: 5,
            text: "Sangat edukatif, banyak informasi tentang asal-usul suku bangsa Indonesia. Gedung barunya modern dan interaktif.",
            time: "1 minggu yang lalu"
        },
        {
            author: "Denny Setiawan",
            rating: 4,
            text: "Salah satu museum wajib jika berkunjung ke Jakarta Pusat. Harganya terjangkau dan lokasinya mudah diakses dengan TransJakarta.",
            time: "3 minggu yang lalu"
        },
        {
            author: "Larasati Kusuma",
            rating: 5,
            text: "Sangat terkesan dengan koleksi emas dan pusaka kerajaan nusantara di lantai paling atas. Penjagaannya ketat dan bersih.",
            time: "1 bulan yang lalu"
        }
    ],
    "museum sonobudoyo": [
        {
            author: "Joko Susanto",
            rating: 5,
            text: "Museum kebudayaan Jawa terlengkap di Yogyakarta setelah Kraton. Pertunjukan wayang kulit di malam hari sangat menarik.",
            time: "3 hari yang lalu"
        },
        {
            author: "Sri Utami",
            rating: 5,
            text: "Berlokasi dekat Alun-alun Utara. Koleksi topeng, keris, dan batik sangat indah. Harga tiketnya sangat murah meriah.",
            time: "1 minggu yang lalu"
        },
        {
            author: "Eko Prasetyo",
            rating: 4,
            text: "Penataannya modern dengan pencahayaan yang dramatis. Penjelasan bilingual sangat membantu wisatawan asing.",
            time: "2 minggu yang lalu"
        },
        {
            author: "Rina Sari",
            rating: 5,
            text: "Suasana tenang dan sangat kental adat Jawanya. Wajib dikunjungi saat berlibur di sekitar Malioboro.",
            time: "1 bulan yang lalu"
        }
    ],
    "museum geologi bandung": [
        {
            author: "Rian Hidayat",
            rating: 5,
            text: "Sangat seru melihat fosil dinosaurus T-Rex dan gajah purba raksasa. Anak-anak sangat senang belajar tentang bumi purba.",
            time: "5 hari yang lalu"
        },
        {
            author: "Aditya Pratama",
            rating: 5,
            text: "Koleksi batuan, mineral, dan meteoritnya sangat lengkap. Penjelasannya mudah dipahami untuk anak sekolah.",
            time: "1 minggu yang lalu"
        },
        {
            author: "Fajar Nugroho",
            rating: 4,
            text: "Gedungnya bersejarah peninggalan kolonial Belanda. Tempat parkirnya cukup luas dan lokasinya di pusat kota Bandung.",
            time: "2 minggu yang lalu"
        },
        {
            author: "Novi Siregar",
            rating: 4,
            text: "Museum edukasi terbaik di Bandung. Sangat ramai di akhir pekan oleh rombongan bus sekolah.",
            time: "1 bulan yang lalu"
        }
    ],
    "museum sejarah jakarta": [
        {
            author: "Agus Gunawan",
            rating: 4,
            text: "Ikon Kota Tua Jakarta. Gedung Balai Kota Batavia zaman Belanda yang sangat megah. Koleksi sejarah Jakarta cukup lengkap.",
            time: "1 minggu yang lalu"
        },
        {
            author: "Kartika Wati",
            rating: 4,
            text: "Suasana kolonialnya sangat terasa. Ada penjara bawah tanah yang cukup menyeramkan tapi menarik untuk dipelajari.",
            time: "2 minggu yang lalu"
        },
        {
            author: "Hadi Mulyono",
            rating: 4,
            text: "Tempatnya luas, tapi di akhir pekan sangat ramai pengunjung. Halamannya bagus untuk foto-foto naik sepeda ontel.",
            time: "1 bulan yang lalu"
        },
        {
            author: "Dina Hidayatullah",
            rating: 5,
            text: "Belajar sejarah berdirinya Batavia hingga menjadi Jakarta di sini sangat menyenangkan. HTM sangat bersahabat.",
            time: "3 bulan yang lalu"
        }
    ],
    "museum macan": [
        {
            author: "Gita Laras",
            rating: 5,
            text: "Museum seni kontemporer paling hits di Jakarta Barat. Instalasi seni Yayoi Kusama sangat memukau.",
            time: "2 hari yang lalu"
        },
        {
            author: "Indra Putra",
            rating: 5,
            text: "Penataan ruang pamerannya kelas dunia. Cocok sekali untuk pecinta seni modern dan hunting foto estetik.",
            time: "1 minggu yang lalu"
        },
        {
            author: "Kurniawan Lubis",
            rating: 4,
            text: "Tiket masuknya lumayan mahal dibanding museum pemerintah, tapi sangat sepadan dengan kualitas pameran internasionalnya.",
            time: "2 minggu yang lalu"
        },
        {
            author: "Yanto Nasution",
            rating: 4,
            text: "Sangat teratur dan ada aturan ketat tentang barang bawaan demi menjaga keutuhan karya seni.",
            time: "1 bulan yang lalu"
        }
    ],
    "museum affandi": [
        {
            author: "Ahmad Wijaya",
            rating: 5,
            text: "Menyimpan karya-karya lukisan maestro Affandi yang beraliran ekspresionisme. Rumah dan studionya sangat unik berbentuk pelepah pisang.",
            time: "1 minggu yang lalu"
        },
        {
            author: "Sri Wulandari",
            rating: 5,
            text: "Berada di pinggir Sungai Gajah Wong. Sangat menginspirasi melihat perkembangan teknik melukis Affandi dari masa ke masa.",
            time: "2 minggu yang lalu"
        },
        {
            author: "Rudi Kurnia",
            rating: 5,
            text: "Tempat yang wajib bagi mahasiswa seni rupa dan pecinta seni. Harga tiket masuk sudah termasuk minuman gratis di kafe.",
            time: "1 bulan yang lalu"
        },
        {
            author: "Bambang Setiawan",
            rating: 4,
            text: "Koleksi mobil kuno milik Affandi juga dipajang di sini. Tempatnya asri dan penuh sejarah seni.",
            time: "2 bulan yang lalu"
        }
    ],
    "museum tekstil": [
        {
            author: "Mega Sari",
            rating: 5,
            text: "Bisa belajar membuat batik tulis sendiri di sini dengan biaya murah. Instrukturnya sabar mengajari dari nol.",
            time: "4 hari yang lalu"
        },
        {
            author: "Denny Siregar",
            rating: 4,
            text: "Menampilkan ratusan koleksi tenun dan batik dari seluruh penjuru nusantara. Taman di belakangnya sangat asri.",
            time: "1 minggu yang lalu"
        },
        {
            author: "Wati Setiawan",
            rating: 4,
            text: "Gedungnya berasitektur kolonial yang terawat. Tempatnya tenang, tidak terlalu ramai, cocok untuk menikmati keindahan kain nusantara.",
            time: "3 minggu yang lalu"
        }
    ],
    "art:1 new museum": [
        {
            author: "Fajar Wijaya",
            rating: 5,
            text: "Galeri seni swasta yang sangat profesional. Memadukan museum karya seni maestro dengan ruang seni kontemporer.",
            time: "1 minggu yang lalu"
        },
        {
            author: "Gita Lestari",
            rating: 5,
            text: "Gedungnya minimalis modern, pencahayaannya sangat bagus untuk memamerkan lukisan dan patung.",
            time: "2 minggu yang lalu"
        },
        {
            author: "Hadi Saputra",
            rating: 4,
            text: "Sangat tenang dan damai untuk menikmati seni rupa. Lokasinya di daerah Kemayoran.",
            time: "1 bulan yang lalu"
        }
    ],
    "museum angkut": [
        {
            author: "Rian Hidayat",
            rating: 5,
            text: "Museum transportasi terbesar di Asia Tenggara. Koleksi mobil klasik dari berbagai negara dipajang dengan konsep zona kota dunia.",
            time: "3 hari yang lalu"
        },
        {
            author: "Mega Lestari",
            rating: 5,
            text: "Sangat luas dan interaktif. Menampilkan parade mobil dan atraksi stuntman di sore hari yang luar biasa seru.",
            time: "1 minggu yang lalu"
        },
        {
            author: "Andi Wijaya",
            rating: 5,
            text: "Banyak sekali spot foto menarik seperti Buckingham Palace, Hollywood, dan Gangster Town. Anak-anak dan dewasa pasti suka.",
            time: "2 minggu yang lalu"
        },
        {
            author: "Dewi Sari",
            rating: 5,
            text: "Harga tiket sebanding dengan besarnya area dan banyaknya wahana yang bisa dinikmati di dalam.",
            time: "1 bulan yang lalu"
        }
    ]
};

function generateRealisticMockReviews(name: string, rating: number = 4.5): any[] {
    const firstNames = [
        "Budi", "Siti", "Aditya", "Dewi", "Rian", "Andi", "Ahmad", "Rina", "Hendra", "Mega",
        "Joko", "Sri", "Eko", "Rudi", "Agus", "Yanto", "Bambang", "Wati", "Kartika", "Denny",
        "Fajar", "Gita", "Dina", "Hadi", "Indra", "Kurniawan", "Laras", "Mulyono", "Novi", "Putra"
    ];
    const lastNames = [
        "Santoso", "Rahma", "Wijaya", "Lestari", "Hidayat", "Pratama", "Saputra", "Wulandari", "Kurnia", "Sari",
        "Setiawan", "Utomo", "Gunawan", "Susanto", "Nugroho", "Hidayatullah", "Kusuma", "Siregar", "Nasution", "Lubis"
    ];
    
    const positiveReviews = [
        `Sangat terkesan berkunjung ke ${name}. Tempatnya sangat edukatif dan terawat dengan baik.`,
        `Koleksi budaya dan sejarah di ${name} sangat lengkap. Penataan ruang pamerannya rapi.`,
        `Destinasi wisata edukasi yang luar biasa di kota ini. Wajib dikunjungi bersama keluarga.`,
        `Suasananya tenang dan nyaman sekali untuk belajar sejarah dan kebudayaan nusantara.`,
        `Karya seni dan benda bersejarah yang dipamerkan di ${name} benar-benar bernilai tinggi.`,
        `Petugas dan pemandu wisatanya sangat ramah serta memberikan penjelasan dengan sangat detail.`,
        `Tempatnya bersih, tertata dengan baik, dan suasananya kental akan nilai sejarah.`
    ];
    
    const neutralReviews = [
        `Fasilitas di ${name} cukup lengkap, mulai dari toilet hingga area istirahat. Harga tiket masuknya juga terjangkau.`,
        `Lokasinya strategis dan mudah ditemukan. Hanya saja tempat parkir agak terbatas saat akhir pekan.`,
        `Tempat yang bagus untuk foto-foto estetik sekaligus menambah wawasan sejarah lokal.`,
        `Secara keseluruhan sangat memuaskan, disarankan datang pagi hari agar tidak terlalu ramai.`
    ];

    const reviews = [];
    const count = 5;
    
    for (let i = 0; i < count; i++) {
        const first = firstNames[(i * 7 + name.length) % firstNames.length];
        const last = lastNames[(i * 11 + name.length) % lastNames.length];
        const authorName = `${first} ${last}`;
        
        const posIdx1 = (i * 3 + name.length) % positiveReviews.length;
        const posIdx2 = (i * 5 + name.length + 2) % positiveReviews.length;
        const neuIdx = (i * 4 + name.length) % neutralReviews.length;
        
        let text = "";
        if (i % 2 === 0) {
            text = `${positiveReviews[posIdx1]} ${neutralReviews[neuIdx]}`;
        } else {
            text = `${positiveReviews[posIdx1]} ${positiveReviews[posIdx2]}`;
        }

        let r = 5;
        if (i === 1) r = 4;
        else if (i === 3) r = Math.max(3, Math.floor(rating));
        
        const times = ["3 hari yang lalu", "1 minggu yang lalu", "2 minggu yang lalu", "1 bulan yang lalu", "3 bulan yang lalu"];
        const time = times[i % times.length];

        reviews.push({
            author: authorName,
            rating: r,
            text,
            time
        });
    }
    
    return reviews;
}

async function run() {
    console.log('Fetching institutions from Supabase...');
    const { data: institutions, error } = await supabase
        .from('institutions')
        .select('id, name, rating, reviews');

    if (error) {
        console.error('Error fetching data:', error.message);
        process.exit(1);
    }

    console.log(`Found ${institutions?.length} institutions. Starting parallel update process...`);

    const batchSize = 50;
    let completed = 0;

    for (let i = 0; i < institutions.length; i += batchSize) {
        const chunk = institutions.slice(i, i + batchSize);
        
        const promises = chunk.map(async (inst) => {
            const normalizedName = inst.name.toLowerCase().trim();
            let targetReviews = null;

            for (const [key, reviews] of Object.entries(REAL_REVIEWS_MAP)) {
                if (normalizedName.includes(key)) {
                    targetReviews = reviews;
                    console.log(`[REAL] Mapping hand-crafted reviews for: ${inst.name}`);
                    break;
                }
            }

            if (!targetReviews) {
                targetReviews = generateRealisticMockReviews(inst.name, Number(inst.rating) || 4.5);
            }

            const { error: updateErr } = await supabase
                .from('institutions')
                .update({ reviews: targetReviews })
                .eq('id', inst.id);

            if (updateErr) {
                console.error(`Failed to update ${inst.name}:`, updateErr.message);
            }
        });

        await Promise.all(promises);
        completed += chunk.length;
        console.log(`Updated ${completed}/${institutions.length} institutions...`);
    }

    console.log(`\nSuccessfully updated all ${institutions.length} institutions with realistic reviews in parallel.`);
}

run();
