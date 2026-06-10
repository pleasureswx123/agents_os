import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/jwt-access.guard';
import { AgentVersionsService } from '../agent-versions/agent-versions.service';
import { AgentsService } from './agents.service';

@Controller()
@UseGuards(JwtAccessGuard)
export class AgentsController {
  constructor(
    @Inject(AgentsService) private readonly agentsService: AgentsService,
    @Inject(AgentVersionsService) private readonly versionsService: AgentVersionsService
  ) {}

  @Get('projects/:projectId/agents')
  async list(@Param('projectId') projectId: string) {
    return this.agentsService.list(projectId);
  }

  @Post('projects/:projectId/agents')
  async create(@Param('projectId') projectId: string, @Body() body: Record<string, unknown>) {
    return this.agentsService.create(projectId, body);
  }

  @Get('agents/:agentId')
  async get(@Param('agentId') agentId: string) {
    return this.agentsService.get(agentId);
  }

  @Patch('agents/:agentId')
  async update(@Param('agentId') agentId: string, @Body() body: Record<string, unknown>) {
    return this.agentsService.update(agentId, body);
  }

  @Post('agents/:agentId/copy')
  async copy(@Param('agentId') agentId: string) {
    return this.agentsService.copy(agentId);
  }

  @Delete('agents/:agentId')
  async delete(@Param('agentId') agentId: string) {
    return this.agentsService.delete(agentId);
  }

  @Post('agents/:agentId/versions')
  async createVersion(@Param('agentId') agentId: string, @Body() body: { versionName: string; notes?: string }) {
    return this.versionsService.create(agentId, body);
  }

  @Get('agents/:agentId/versions')
  async listVersions(@Param('agentId') agentId: string) {
    return this.versionsService.list(agentId);
  }

  @Get('agent-versions/:versionId')
  async getVersion(@Param('versionId') versionId: string) {
    return this.versionsService.get(versionId);
  }

  @Post('agents/:agentId/restore-version')
  async restore(@Param('agentId') agentId: string, @Body() body: { agentVersionId: string }) {
    return this.versionsService.restore(agentId, body.agentVersionId);
  }
}
