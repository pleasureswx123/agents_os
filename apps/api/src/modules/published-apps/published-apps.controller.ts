import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/jwt-access.guard';
import { PublishedAppsService } from './published-apps.service';

@Controller()
export class PublishedAppsController {
  constructor(@Inject(PublishedAppsService) private readonly service: PublishedAppsService) {}

  @UseGuards(JwtAccessGuard)
  @Get('projects/:projectId/published-apps')
  list(@Param('projectId') projectId: string) {
    return this.service.list(projectId);
  }

  @UseGuards(JwtAccessGuard)
  @Post('projects/:projectId/published-apps')
  create(@Param('projectId') projectId: string, @Body() body: Record<string, unknown>) {
    return this.service.create(projectId, body);
  }

  @Get('published-apps/:slug')
  getPublic(@Param('slug') slug: string) {
    return this.service.getPublicDetails(slug);
  }

  @Post('published-apps/:slug/runs')
  run(@Param('slug') slug: string, @Body() body: { input?: Record<string, unknown> }) {
    return this.service.run(slug, body);
  }

  @Get('published-apps/:slug/runs/:runId')
  getPublicRun(@Param('slug') slug: string, @Param('runId') runId: string) {
    return this.service.getPublicRun(slug, runId);
  }

  @Get('published-apps/:slug/artifacts/:artifactId/download')
  getPublicArtifactDownload(@Param('slug') slug: string, @Param('artifactId') artifactId: string) {
    return this.service.getPublicArtifactDownload(slug, artifactId);
  }
}
