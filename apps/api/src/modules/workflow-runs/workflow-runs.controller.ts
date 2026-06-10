import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/jwt-access.guard';
import { WorkflowRunsService } from './workflow-runs.service';

@UseGuards(JwtAccessGuard)
@Controller()
export class WorkflowRunsController {
  constructor(@Inject(WorkflowRunsService) private readonly service: WorkflowRunsService) {}

  @Post('workflows/:workflowId/runs')
  create(@Param('workflowId') workflowId: string, @Body() body: { input?: Record<string, unknown>; workflowSnapshotId?: string }) {
    return this.service.createFromWorkflow(workflowId, body);
  }

  @Get('workflow-runs/:runId')
  get(@Param('runId') runId: string) {
    return this.service.get(runId);
  }

  @Post('workflow-runs/:runId/node-runs/:nodeRunId/rerun')
  rerunNode(@Param('runId') runId: string, @Param('nodeRunId') nodeRunId: string) {
    return this.service.rerunNode(runId, nodeRunId);
  }
}
