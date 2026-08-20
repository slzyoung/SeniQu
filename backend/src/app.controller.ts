import { Controller, Get, HttpCode, Query, Res, BadRequestException } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import * as https from 'https';

// Concurrency queue for HEIC conversion to prevent blocking Node event loop
let currentConversionPromise: Promise<any> = Promise.resolve();

@ApiTags('Root')
@Controller()
export class AppController {
    constructor(private readonly appService: AppService) { }

    @Get()
    @Public()
    @ApiOperation({ summary: 'Welcome endpoint' })
    getHello() {
        return this.appService.getHello();
    }

    @Get('favicon.ico')
    @Public()
    @HttpCode(204)
    @ApiOperation({ summary: 'Favicon handler to prevent 404 errors' })
    getFavicon() {
        // Return 204 No Content for favicon requests
    }

    @Get('proxy')
    @Public()
    @ApiOperation({ summary: 'CORS Proxy for CDN assets' })
    async proxyCdnAsset(@Query('url') url: string, @Res() res: any) {
        if (!url || !url.startsWith('https://cdn.seniqu.art/')) {
            throw new BadRequestException('Invalid target URL');
        }

        try {
            const isHeic = url.toLowerCase().split('?')[0].endsWith('.heic');
            
            // Check cache for HEIC conversions to avoid heavy CPU processing
            let cachePath = '';
            if (isHeic) {
                const urlHash = crypto.createHash('md5').update(url).digest('hex');
                const cacheDir = path.join(process.cwd(), 'temp_cache');
                
                // Ensure cache directory exists
                if (!fs.existsSync(cacheDir)) {
                    fs.mkdirSync(cacheDir, { recursive: true });
                }
                
                cachePath = path.join(cacheDir, `${urlHash}.jpg`);
                if (fs.existsSync(cachePath)) {
                    const cachedBuffer = fs.readFileSync(cachePath);
                    
                    if (typeof res.header === 'function') {
                        res.header('Content-Type', 'image/jpeg');
                        res.header('Cache-Control', 'public, max-age=31536000, immutable');
                        res.header('Access-Control-Allow-Origin', '*');
                    } else if (typeof res.setHeader === 'function') {
                        res.setHeader('Content-Type', 'image/jpeg');
                        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                    }
                    
                    if (typeof res.status === 'function') {
                        res.status(200);
                    }
                    
                    return res.send(cachedBuffer);
                }
            }

            // Use standard node https module to avoid native fetch / undici DNS lookup bugs
            const { buffer: fetchedBuffer, contentType: fetchedContentType } = await new Promise<{ buffer: Buffer; contentType: string }>((resolve, reject) => {
                https.get(url, (cdnRes) => {
                    if (cdnRes.statusCode !== 200) {
                        reject(new Error(`CDN returned status ${cdnRes.statusCode}`));
                        return;
                    }
                    const contentType = cdnRes.headers['content-type'] || 'application/octet-stream';
                    const chunks: any[] = [];
                    cdnRes.on('data', (chunk) => chunks.push(chunk));
                    cdnRes.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType }));
                }).on('error', reject);
            });

            let buffer = fetchedBuffer;
            let contentType = fetchedContentType;

            // Convert HEIC to JPEG on the fly
            if (isHeic) {
                try {
                    // Queue the conversion to avoid blocking the event loop with parallel CPU-bound tasks
                    const convertTask = () => new Promise<Buffer>(async (resolveConvert, rejectConvert) => {
                        try {
                            // eslint-disable-next-line @typescript-eslint/no-var-requires
                            const heicConvert = require('heic-convert');
                            const convertedBuffer = await heicConvert({
                                buffer,
                                format: 'JPEG',
                                quality: 0.85
                            });
                            resolveConvert(Buffer.from(convertedBuffer));
                        } catch (convError) {
                            rejectConvert(convError);
                        }
                    });

                    // Chain the promise to serialize execution
                    const convertedBuffer = await (currentConversionPromise = currentConversionPromise
                        .then(convertTask)
                        .catch(convertTask)); // continue queue even if previous failed

                    buffer = convertedBuffer;
                    contentType = 'image/jpeg';
                    
                    // Save to local cache
                    if (cachePath) {
                        fs.writeFileSync(cachePath, buffer);
                    }
                } catch (convError: any) {
                    console.error('Failed to convert HEIC to JPEG in proxy:', convError);
                }
            }
            
            if (typeof res.header === 'function') {
                res.header('Content-Type', contentType);
                res.header('Cache-Control', 'public, max-age=31536000, immutable');
                res.header('Access-Control-Allow-Origin', '*');
            } else if (typeof res.setHeader === 'function') {
                res.setHeader('Content-Type', contentType);
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                res.setHeader('Access-Control-Allow-Origin', '*');
            }
            
            if (typeof res.status === 'function') {
                res.status(200);
            }

            return res.send(buffer);
        } catch (error: any) {
            throw new BadRequestException(`Failed to proxy resource: ${error.message}`);
        }
    }
}
