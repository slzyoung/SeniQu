import { Controller, Get, HttpCode } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

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
}
