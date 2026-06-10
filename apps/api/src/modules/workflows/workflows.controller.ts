import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/jwt-access.guard';
import { WorkflowsService } from './workflows.service';

@Controller()
@UseGuards(JwtAccessGuard)
export class WorkflowsController {
  constructor(@Inject(WorkflowsService) private readonly workflowsService: WorkflowsService) {}

  @Get('projects/:projectId/workflows')
  async list(@Param('projectId') projectId: string) {
    return this.workflowsService.list(projectId);
  }

  @Post('projects/:projectId/workflows')
  async create(@Param('projectId') projectId: string, @Body() body: Record<string, unknown>) {
    return this.workflowsService.create(projectId, body);
  }

  @Get('workflows/:workflowId')
  async get(@Param('workflowId') workflowId: string) {
    return this.workflowsService.get(workflowId);
  }

  @Patch('workflows/:workflowId')
  async update(@Param('workflowId') workflowId: string, @Body() body: Record<string, unknown>) {
    return this.workflowsService.update(workflowId, body);
  }

  @Delete('workflows/:workflowId')
  async delete(@Param('workflowId') workflowId: string) {
    return this.workflowsService.delete(workflowId);
  }

  @Post('workflows/:workflowId/nodes')
  async createNode(@Param('workflowId') workflowId: string, @Body() body: Record<string, unknown>) {
    return this.workflowsService.createNode(workflowId, body);
  }

  @Patch('workflow-nodes/:nodeId')
  async updateNode(@Param('nodeId') nodeId: string, @Body() body: Record<string, unknown>) {
    return this.workflowsService.updateNode(nodeId, body);
  }

  @Delete('workflow-nodes/:nodeId')
  async deleteNode(@Param('nodeId') nodeId: string) {
    return this.workflowsService.deleteNode(nodeId);
  }

  @Post('workflows/:workflowId/snapshots')
  async snapshot(@Param('workflowId') workflowId: string, @Body() body: { versionName: string; notes?: string }) {
    return this.workflowsService.createSnapshot(workflowId, body);
  }
}
