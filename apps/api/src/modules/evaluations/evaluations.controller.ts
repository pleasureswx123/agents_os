import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/jwt-access.guard';
import { EvaluationsService } from './evaluations.service';

@Controller()
@UseGuards(JwtAccessGuard)
export class EvaluationsController {
  constructor(@Inject(EvaluationsService) private readonly evaluationsService: EvaluationsService) {}

  @Get('agents/:agentId/test-cases')
  async listCases(@Param('agentId') agentId: string) {
    return this.evaluationsService.listTestCases(agentId);
  }

  @Post('agents/:agentId/test-cases')
  async createCase(@Param('agentId') agentId: string, @Body() body: Record<string, unknown>) {
    return this.evaluationsService.createTestCase(agentId, body);
  }

  @Patch('test-cases/:testCaseId')
  async updateCase(@Param('testCaseId') testCaseId: string, @Body() body: Record<string, unknown>) {
    return this.evaluationsService.updateTestCase(testCaseId, body);
  }

  @Post('test-cases/:testCaseId/run')
  async runCase(@Param('testCaseId') testCaseId: string, @Body() body: { agentVersionId: string }) {
    return this.evaluationsService.runTestCase(testCaseId, body.agentVersionId);
  }

  @Get('test-cases/:testCaseId/results')
  async listResults(@Param('testCaseId') testCaseId: string) {
    return this.evaluationsService.listResults(testCaseId);
  }

  @Patch('test-results/:resultId')
  async scoreResult(@Param('resultId') resultId: string, @Body() body: { rating?: string; notes?: string }) {
    return this.evaluationsService.scoreResult(resultId, body);
  }
}
