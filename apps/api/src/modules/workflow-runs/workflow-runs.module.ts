import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkflowRunsController } from './workflow-runs.controller';
import { WorkflowRunsQueue } from './workflow-runs.queue';
import { WorkflowRunsService } from './workflow-runs.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [WorkflowRunsController],
  providers: [WorkflowRunsService, WorkflowRunsQueue],
  exports: [WorkflowRunsService]
})
export class WorkflowRunsModule {}
