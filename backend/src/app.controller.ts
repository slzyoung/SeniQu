import { Controller, Get, HttpCode, Query, Res, BadRequestException } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

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
                        res.header('Access-Control-Allow-Origin', '*');
                    } else if (typeof res.setHeader === 'function') {
                        res.setHeader('Content-Type', 'image/jpeg');
                        res.setHeader('Access-Control-Allow-Origin', '*');
                    }
                    
                    if (typeof res.status === 'function') {
                        res.status(200);
                    }
                    
                    return res.send(cachedBuffer);
                }
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new BadRequestException(`CDN returned status ${response.status}`);
            }

            let contentType = response.headers.get('content-type') || 'application/octet-stream';
            const arrayBuffer = await response.arrayBuffer();
            let buffer = Buffer.from(arrayBuffer);

            // Convert HEIC to JPEG on the fly
            if (isHeic) {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    const heicConvert = require('heic-convert');
                    const convertedBuffer = await heicConvert({
                        buffer,
                        format: 'JPEG',
                        quality: 0.85
                    });
                    buffer = Buffer.from(convertedBuffer);
                    contentType = 'image/jpeg';
                    
                    // Save to local cache
                    if (cachePath) {
                        fs.writeFileSync(cachePath, buffer);
                    }
                } catch (convError: any) {
                    console.error('Failed to convert HEIC to JPEG in proxy:', convError);
                    // Fallback to original buffer if conversion fails
                }
            }
            
            if (typeof res.header === 'function') {
                res.header('Content-Type', contentType);
                res.header('Access-Control-Allow-Origin', '*');
            } else if (typeof res.setHeader === 'function') {
                res.setHeader('Content-Type', contentType);
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
