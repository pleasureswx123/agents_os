import { Controller, Get, Inject, Param, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/jwt-access.guard';
import { TemplatesService } from './templates.service';

@Controller('templates')
@UseGuards(JwtAccessGuard)
export class TemplatesController {
  constructor(@Inject(TemplatesService) private readonly templatesService: TemplatesService) {}

  @Get()
  async list() {
    return this.templatesService.listTemplates();
  }

  @Get(':templateId/versions/:versionId')
  async getVersion(@Param('templateId') templateId: string, @Param('versionId') versionId: string) {
    return this.templatesService.getTemplateVersion(templateId, versionId);
  }
}
