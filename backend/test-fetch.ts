import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { ArtistService } from './src/artist/artist.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const artistService = app.get(ArtistService);
  const artistId = '0331fc42-baf9-4fc1-8dd8-4a31474d2f8b';
  try {
    const res = await artistService.getArtistArtworks(artistId, 1, 12);
    console.log(JSON.stringify(res.data.map(d => ({title: d.title, status: d.status, isArt: d.isArt})), null, 2));
  } catch (e) {
    console.error(e);
  }
  await app.close();
}
bootstrap();
