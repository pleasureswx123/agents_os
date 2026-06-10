import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../object-storage/storage.module';
import { WorkflowRunsModule } from '../workflow-runs/workflow-runs.module';
import { PublishedAppsController } from './published-apps.controller';
import { PublishedAppsService } from './published-apps.service';

@Module({
  imports: [AuthModule, PrismaModule, StorageModule, WorkflowRunsModule],
  controllers: [PublishedAppsController],
  providers: [PublishedAppsService],
  exports: [PublishedAppsService]
})
export class PublishedAppsModule {}
