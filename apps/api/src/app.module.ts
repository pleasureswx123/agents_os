import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TemplatesModule } from './modules/templates/templates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    AuthModule,
    TemplatesModule,
    ProjectsModule
  ]
})
export class AppModule {}
