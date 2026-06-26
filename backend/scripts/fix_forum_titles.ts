/**
 * Fix Forum Titles - One-time migration script
 * 
 * Fixes the double-encoded HTML entity corruption in forum_threads titles.
 * Handles both standard entities (&amp;) AND malformed chains (ampampamp).
 * 
 * Usage: npx tsx scripts/fix_forum_titles.ts
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/**
 * Fully decode all layers of HTML entities AND malformed amp chains.
 * 
 * Handles patterns like:
 * - &amp;amp;amp; → &
 * - &ampampampamp → &
 * - &amp;lt; → <
 * - &amp;quot; → "
 */
function fullyDecode(str: string): string {
    let result = str
    let prev = ""

    for (let i = 0; i < 30 && result !== prev; i++) {
        prev = result

        // Standard HTML entity decoding
        result = result
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&#x60;/g, "`")
            .replace(/&#039;/g, "'")

        // Malformed amp chains WITHOUT semicolons: &ampampampamp → &
        // This regex collapses any sequence of "amp" repetitions following an "&"
        result = result.replace(/&(amp)+/g, "&")
    }

    return result
}

async function fixTitles() {
    console.log("🔍 Scanning forum_threads for corrupted titles...")

    const { data: threads, error } = await supabase
        .from("forum_threads")
        .select("id, title, content")

    if (error) {
        console.error("❌ Failed to fetch threads:", error.message)
        process.exit(1)
    }

    if (!threads || threads.length === 0) {
        console.log("ℹ️  No threads found.")
        return
    }

    console.log(`📋 Found ${threads.length} threads. Checking for corruption...`)

    let fixedCount = 0

    for (const thread of threads) {
        const decodedTitle = fullyDecode(thread.title || "")
        const decodedContent = fullyDecode(thread.content || "")

        const titleChanged = decodedTitle !== thread.title
        const contentChanged = decodedContent !== thread.content

        if (titleChanged || contentChanged) {
            const updates: any = {}
            if (titleChanged) updates.title = decodedTitle
            if (contentChanged) updates.content = decodedContent

            console.log(`  🔧 Fixing thread ${thread.id}:`)
            if (titleChanged) {
                console.log(`     Title: "${thread.title}"`)
                console.log(`         → "${decodedTitle}"`)
            }
            if (contentChanged) {
                console.log(`     Content: corrupted → fixed`)
            }

            const { error: updateError } = await supabase
                .from("forum_threads")
                .update(updates)
                .eq("id", thread.id)

            if (updateError) {
                console.error(`  ❌ Failed to update thread ${thread.id}:`, updateError.message)
            } else {
                fixedCount++
            }
        }
    }

    // Also fix forum_posts
    console.log("\n🔍 Scanning forum_posts for corrupted content...")

    const { data: posts, error: postsError } = await supabase
        .from("forum_posts")
        .select("id, content")

    if (!postsError && posts) {
        for (const post of posts) {
            const decodedContent = fullyDecode(post.content || "")
            if (decodedContent !== post.content) {
                console.log(`  🔧 Fixing post ${post.id}`)
                const { error: updateError } = await supabase
                    .from("forum_posts")
                    .update({ content: decodedContent })
                    .eq("id", post.id)
                if (!updateError) fixedCount++
            }
        }
    }

    console.log(`\n✅ Done! Fixed ${fixedCount} records.`)
}

fixTitles().catch(console.error)
