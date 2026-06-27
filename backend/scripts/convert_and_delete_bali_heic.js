const { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
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

const BALI_FOLDERS = [
  'Bali/Museum/MUSEUM PASIFIKA/',
  'Bali/Museum/Museum Geopark Batur/',
  'Bali/Museum/UPT. MUSEUM BALI/'
];

const CONCURRENCY = 15;

const streamToBuffer = (stream) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });

async function main() {
  console.log(`Starting prioritized concurrent HEIC-to-JPG conversion and deletion for Bali folders...`);
  
  try {
    const allHeicObjects = [];
    
    // 1. Gather all HEIC files from the 3 Bali folders
    for (const folder of BALI_FOLDERS) {
      console.log(`Scanning folder: ${folder}...`);
      let continuationToken = undefined;
      do {
        const listCommand = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: folder,
          MaxKeys: 1000,
          ContinuationToken: continuationToken
        });
        const response = await s3.send(listCommand);
        if (response.Contents) {
          const filtered = response.Contents.filter(obj => 
            obj.Key.toLowerCase().endsWith('.heic')
          );
          allHeicObjects.push(...filtered);
        }
        continuationToken = response.NextContinuationToken;
      } while (continuationToken);
    }
    
    // Prioritize Geopark Batur and UPT. MUSEUM BALI first
    allHeicObjects.sort((a, b) => {
      const aIsBaturOrUpt = a.Key.includes('Geopark Batur') || a.Key.includes('MUSEUM BALI');
      const bIsBaturOrUpt = b.Key.includes('Geopark Batur') || b.Key.includes('MUSEUM BALI');
      if (aIsBaturOrUpt && !bIsBaturOrUpt) return -1;
      if (!aIsBaturOrUpt && bIsBaturOrUpt) return 1;
      return 0;
    });

    const total = allHeicObjects.length;
    console.log(`Found total of ${total} HEIC files in Bali folders (with Batur & UPT Bali prioritized).`);
    
    if (total === 0) {
      console.log('No HEIC files found to process.');
      return;
    }

    // 2. Prepare queue
    const queue = allHeicObjects.map((obj, i) => ({
      obj,
      index: i + 1,
      total
    }));

    // 3. Worker logic
    const worker = async (workerId) => {
      while (queue.length > 0) {
        const task = queue.shift();
        if (!task) break;
        
        const { obj, index } = task;
        const heicKey = obj.Key;
        const jpgKey = heicKey.replace(/\.HEIC$/i, '.jpg');
        
        console.log(`[Worker ${workerId}][${index}/${total}] Processing: ${heicKey}`);
        
        try {
          // A. Download original HEIC
          const getCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: heicKey,
          });
          const getResponse = await s3.send(getCommand);
          const heicBuffer = await streamToBuffer(getResponse.Body);
          
          // B. Convert to JPEG
          const jpegBuffer = await convert({
            buffer: heicBuffer,
            format: 'JPEG',
            quality: 0.85
          });
          
          // C. Upload JPEG
          const putCommand = new PutObjectCommand({
            Bucket: bucketName,
            Key: jpgKey,
            Body: jpegBuffer,
            ContentType: 'image/jpeg',
          });
          await s3.send(putCommand);
          
          // D. Delete original HEIC
          const deleteCommand = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: heicKey,
          });
          await s3.send(deleteCommand);
          console.log(`[Worker ${workerId}][${index}/${total}] Success: ${heicKey} -> ${jpgKey}`);
        } catch (err) {
          console.error(`[Worker ${workerId}][${index}/${total}] Failed ${heicKey}:`, err.message);
        }
      }
    };

    // 4. Start concurrent workers
    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      workers.push(worker(i + 1));
    }
    
    await Promise.all(workers);
    console.log('\nTargeted conversion and deletion complete for all 3 Bali folders!');
  } catch (error) {
    console.error('Error during batch execution:', error);
  }
}

main();
