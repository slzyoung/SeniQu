import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
    getHello(): { message: string; version: string; docs: string } {
        return {
            message: 'Welcome to SeniQu API',
            version: '1.0.0',
            docs: '/api/docs',
        };
    }
}
