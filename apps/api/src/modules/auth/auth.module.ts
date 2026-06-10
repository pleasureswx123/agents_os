import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAccessGuard } from './jwt-access.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtAccessGuard],
  exports: [AuthService, JwtAccessGuard]
})
export class AuthModule {}
