import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AgentVersionsModule } from '../agent-versions/agent-versions.module';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';

@Module({
  imports: [AuthModule, AgentVersionsModule],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService]
})
export class AgentsModule {}
