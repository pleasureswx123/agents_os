import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AgentVersionsService } from './agent-versions.service';

@Module({
  imports: [AuthModule],
  providers: [AgentVersionsService],
  exports: [AgentVersionsService]
})
export class AgentVersionsModule {}
