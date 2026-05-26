import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

async function test() {
    const { data: institutions, error } = await supabase
        .from('institutions')
        .select('name, city, cover_image_url, reviews')

    if (error || !institutions) {
        console.error("Error:", error?.message)
        return
    }

    const mockAuthors = [
        "Budi Santoso", "Siti Rahma", "Aditya Wijaya", "Dewi Lestari", "Rian Hidayat",
        "Andi Saputra", "Ahmad Saputra", "Rina Wulandari", "Hendra Kurnia", "Mega Sari",
        "Joko Susanto", "Sri Utami", "Eko Prasetyo", "Rudi Kurnia", "Agus Gunawan",
        "Yanto Nasution", "Bambang Setiawan", "Wati Setiawan", "Kartika Wati", "Denny Siregar",
        "Fajar Wijaya", "Gita Lestari", "Dina Hidayatullah", "Hadi Saputra", "Indra Putra",
        "Kurniawan Lubis", "Larasati Kusuma", "Mulyono Utomo", "Novi Siregar", "Putra Susanto"
    ]

    let needsCover = 0
    let needsReviews = 0
    let both = 0

    institutions.forEach(i => {
        const coverMock = !i.cover_image_url || !i.cover_image_url.includes("cdn.seniqu.art")
        const reviewMock = !i.reviews || i.reviews.length === 0 || i.reviews.some((r: any) => mockAuthors.includes(r.author))

        if (coverMock) needsCover++
        if (reviewMock) needsReviews++
        if (coverMock && reviewMock) both++
    })

    console.log(`Total institutions: ${institutions.length}`)
    console.log(`Needs cover image: ${needsCover}`)
    console.log(`Needs authentic reviews: ${needsReviews}`)
    console.log(`Needs both: ${both}`)
}

test()
