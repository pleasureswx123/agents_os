import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { AgentsModule } from './modules/agents/agents.module';
import { AgentVersionsModule } from './modules/agent-versions/agent-versions.module';
import { ChatsModule } from './modules/chats/chats.module';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TemplatesModule } from './modules/templates/templates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    AuthModule,
    ProvidersModule,
    AgentVersionsModule,
    AgentsModule,
    ChatsModule,
    EvaluationsModule,
    TemplatesModule,
    ProjectsModule
  ]
})
export class AppModule {}
