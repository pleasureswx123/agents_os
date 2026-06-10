import { Body, Controller, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/jwt-access.guard';
import { ChatsService } from './chats.service';

@Controller('agents/:agentId/chat')
@UseGuards(JwtAccessGuard)
export class ChatsController {
  constructor(@Inject(ChatsService) private readonly chatsService: ChatsService) {}

  @Post()
  async chat(
    @Param('agentId') agentId: string,
    @Body() body: { chatSessionId?: string; input: Record<string, unknown> }
  ) {
    return this.chatsService.chat(agentId, body);
  }
}
