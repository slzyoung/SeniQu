import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MuseumsService } from '../src/museums/museums.service';

async function run() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const service = app.get(MuseumsService);
    
    console.log('Calling searchNearbyPlaces for Surabaya...');
    const result = await service.searchNearbyPlaces(-7.2575, 112.7521, 35000);
    console.log(`Places found: ${result?.places?.length || 0}`);
    if (result?.places) {
        result.places.forEach((p: any, i: number) => {
            if (i < 15) {
                console.log(`- Name: ${p.name}, Lat: ${p.latitude}, Lng: ${p.longitude}, City: ${p.city}, Cover: ${p.photos?.[0]}`);
            }
        });
    }
    
    await app.close();
}

run().catch(err => {
    console.error('Error:', err);
});
