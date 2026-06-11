import { Module } from '@nestjs/common';
import { WorkflowRunsModule } from '../workflow-runs/workflow-runs.module';
import { RunEventsGateway } from './run-events.gateway';

@Module({
  imports: [WorkflowRunsModule],
  providers: [RunEventsGateway],
  exports: [RunEventsGateway]
})
export class RunEventsModule {}
