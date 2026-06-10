import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { JwtAccessGuard, type AuthenticatedRequest } from '../auth/jwt-access.guard';
import { ProjectsService } from './projects.service';

interface CreateProjectBody {
  name: string;
  description?: string;
  templateVersionId?: string;
}

interface UpdateProjectBody {
  name?: string;
  description?: string;
}

interface SaveAsTemplateBody {
  name: string;
  description?: string;
}

@Controller()
@UseGuards(JwtAccessGuard)
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projectsService: ProjectsService) {}

  @Get('projects')
  async list(@Req() request: FastifyRequest & AuthenticatedRequest) {
    return this.projectsService.listProjects(request.user.organizationId);
  }

  @Post('projects')
  async create(@Req() request: FastifyRequest & AuthenticatedRequest, @Body() body: CreateProjectBody) {
    return this.projectsService.createProject(request.user, body);
  }

  @Get('projects/:projectId')
  async get(@Req() request: FastifyRequest & AuthenticatedRequest, @Param('projectId') projectId: string) {
    return this.projectsService.getProject(request.user.organizationId, projectId);
  }

  @Patch('projects/:projectId')
  async update(
    @Req() request: FastifyRequest & AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() body: UpdateProjectBody
  ) {
    return this.projectsService.updateProject(request.user.organizationId, projectId, body);
  }

  @Delete('projects/:projectId')
  async delete(@Req() request: FastifyRequest & AuthenticatedRequest, @Param('projectId') projectId: string) {
    return this.projectsService.deleteProject(request.user.organizationId, projectId);
  }

  @Post('projects/:projectId/save-as-template')
  async saveAsTemplate(
    @Req() request: FastifyRequest & AuthenticatedRequest,
    @Param('projectId') projectId: string,
    @Body() body: SaveAsTemplateBody
  ) {
    return this.projectsService.saveAsTemplate(request.user.organizationId, projectId, body);
  }
}
