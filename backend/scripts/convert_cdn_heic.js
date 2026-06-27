const { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const convert = require('heic-convert');
require('dotenv').config();

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  console.error('Error: Cloudflare R2 environment variables are missing!');
  process.exit(1);
}

const s3 = new S3Client({
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  region: 'auto',
});

// Helper to read S3 stream into Buffer
const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });

async function main() {
  console.log(`Starting CDN HEIC to JPG conversion on bucket: ${bucketName}...`);
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1000,
    });
    
    const response = await s3.send(listCommand);
    if (!response.Contents) {
      console.log('No objects found in the bucket.');
      return;
    }
    
    // Filter for HEIC files
    const heicObjects = response.Contents.filter(obj => 
      obj.Key.toLowerCase().endsWith('.heic')
    );
    
    console.log(`Found ${heicObjects.length} HEIC files to convert.`);
    
    for (let i = 0; i < heicObjects.length; i++) {
      const obj = heicObjects[i];
      const heicKey = obj.Key;
      const jpgKey = heicKey.replace(/\.HEIC$/i, '.jpg');
      
      console.log(`\n[${i + 1}/${heicObjects.length}] Processing: ${heicKey}`);
      
      try {
        // 1. Download original HEIC file
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: heicKey,
        });
        const getResponse = await s3.send(getCommand);
        const heicBuffer = await streamToBuffer(getResponse.Body);
        console.log(`  Downloaded: ${heicBuffer.length} bytes`);
        
        // 2. Convert to JPEG
        console.log('  Converting to JPEG...');
        const jpegBuffer = await convert({
          buffer: heicBuffer,
          format: 'JPEG',
          quality: 0.85
        });
        console.log(`  Converted: ${jpegBuffer.length} bytes`);
        
        // 3. Upload JPEG back to R2
        const putCommand = new PutObjectCommand({
          Bucket: bucketName,
          Key: jpgKey,
          Body: jpegBuffer,
          ContentType: 'image/jpeg',
        });
        await s3.send(putCommand);
        console.log(`  Uploaded counterpart: ${jpgKey}`);
      } catch (err) {
        console.error(`  Error processing ${heicKey}:`, err.message);
      }
    }
    
    console.log('\nAll HEIC files processed and JPEGs generated successfully!');
  } catch (error) {
    console.error('Error during batch execution:', error);
  }
}

main();
