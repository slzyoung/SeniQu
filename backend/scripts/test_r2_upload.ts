import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import * as dotenv from "dotenv"
import * as path from "path"

dotenv.config({ path: path.resolve(__dirname, "../.env") })

const accountId = process.env.R2_ACCOUNT_ID
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const bucketName = process.env.R2_BUCKET_NAME || "seniqu"
const publicUrl = process.env.R2_PUBLIC_URL || "https://cdn.seniqu.art"

async function testConnection() {
    console.log("=== Cloudflare R2 Connection Test ===")
    console.log(`Account ID: ${accountId}`)
    console.log(`Access Key ID: ${accessKeyId}`)
    console.log(`Bucket Name: ${bucketName}`)
    console.log(`Public CDN URL: ${publicUrl}`)

    if (!accountId || !accessKeyId || !secretAccessKey) {
        console.error("❌ Missing required R2 credentials in .env file.")
        process.exit(1)
    }

    const s3Client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    })

    const testKey = `test-connection-${Date.now()}.txt`
    const testContent = "SeniQu Cloudflare R2 Upload Test Success!"

    console.log(`\nAttempting to upload test file: '${testKey}'...`)

    try {
        await s3Client.send(
            new PutObjectCommand({
                Bucket: bucketName,
                Key: testKey,
                Body: Buffer.from(testContent),
                ContentType: "text/plain",
                CacheControl: "public, max-age=3600",
            })
        )

        console.log("✅ Upload to R2 Bucket SUCCESSFUL!")
        const publicFileUrl = `${publicUrl.replace(/\/$/, "")}/${testKey}`
        console.log(`🔗 Public access URL: ${publicFileUrl}`)
        console.log("Please check if you can open this URL in your browser to verify CDN access.")
    } catch (error: any) {
        console.error("❌ R2 Upload FAILED!")
        console.error("Error Message:", error.message)
        console.error("Error Details:", error)
    }
}

testConnection()
