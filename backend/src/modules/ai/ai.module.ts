import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { DatabaseModule } from '../../database/database.module';
import { StorageModule } from '../../storage/storage.module';

@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
