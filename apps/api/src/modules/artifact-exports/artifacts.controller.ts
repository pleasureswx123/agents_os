import { Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/jwt-access.guard';
import { ArtifactsService } from './artifacts.service';

@UseGuards(JwtAccessGuard)
@Controller()
export class ArtifactsController {
  constructor(@Inject(ArtifactsService) private readonly service: ArtifactsService) {}

  @Post('workflow-runs/:runId/export')
  exportRun(@Param('runId') runId: string) {
    return this.service.exportRun(runId);
  }

  @Get('artifacts/:artifactId/download')
  getDownload(@Param('artifactId') artifactId: string) {
    return this.service.getDownload(artifactId);
  }
}
