const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config();

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  console.error('Error: Cloudflare R2 environment variables are missing!');
  process.exit(1);
}

// R2 Client configuration
const s3 = new S3Client({
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
  region: 'auto',
});

async function main() {
  console.log(`Listing objects in bucket: ${bucketName}...`);
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      MaxKeys: 1000,
    });
    const response = await s3.send(command);
    if (!response.Contents) {
      console.log('No objects found in the bucket.');
      return;
    }
    console.log(`Found ${response.Contents.length} objects total.`);
    
    // Group keys by prefix/folders
    const folders = new Set();
    const filesByFolder = {};

    response.Contents.forEach(obj => {
      const parts = obj.Key.split('/');
      if (parts.length > 1) {
        const folder = parts[0] + '/' + (parts[1] ? parts[1] + '/' : '');
        folders.add(folder);
        if (!filesByFolder[folder]) {
          filesByFolder[folder] = [];
        }
        filesByFolder[folder].push(obj.Key);
      } else {
        folders.add('/');
        if (!filesByFolder['/']) {
          filesByFolder['/'] = [];
        }
        filesByFolder['/'].push(obj.Key);
      }
    });

    console.log('\n--- DETECTED DIRECTORIES & FILE COUNTS ---');
    for (const folder of folders) {
      console.log(`Folder/Prefix: "${folder}" | Files: ${filesByFolder[folder].length}`);
      // Show first 3 files
      filesByFolder[folder].slice(0, 3).forEach(f => {
        console.log(`  - ${f}`);
      });
    }

  } catch (error) {
    console.error('Error listing R2 objects:', error);
  }
}

main();
