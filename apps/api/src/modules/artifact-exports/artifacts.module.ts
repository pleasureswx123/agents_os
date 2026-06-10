import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../object-storage/storage.module';
import { ArtifactsController } from './artifacts.controller';
import { ArtifactsService } from './artifacts.service';

@Module({
  imports: [AuthModule, PrismaModule, StorageModule],
  controllers: [ArtifactsController],
  providers: [ArtifactsService],
  exports: [ArtifactsService]
})
export class ArtifactsModule {}
