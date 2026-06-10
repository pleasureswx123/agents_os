import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import { runEventsRedisChannel, type NodeEventPayload, type RunEventPayload } from '@agents-os/shared';
import Redis from 'ioredis';
import type { Server, Socket } from 'socket.io';

type RedisRunEvent = {
  event: string;
  payload: RunEventPayload | NodeEventPayload;
};

@Injectable()
@WebSocketGateway({
  namespace: '/runs',
  cors: {
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    credentials: true
  }
})
export class RunEventsGateway implements OnModuleInit, OnModuleDestroy, OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RunEventsGateway.name);
  private readonly subscriber = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });

  async onModuleInit() {
    await this.subscriber.subscribe(runEventsRedisChannel);
    this.subscriber.on('message', (_channel, message) => {
      try {
        const event = JSON.parse(message) as RedisRunEvent;
        this.emit(event.event, event.payload);
      } catch (error) {
        this.logger.warn(`Ignored malformed run event: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }

  async onModuleDestroy() {
    await this.subscriber.quit();
  }

  handleConnection(client: Socket) {
    const runId = client.handshake.query.runId;
    if (typeof runId === 'string' && runId.length > 0) {
      void client.join(this.room(runId));
    }
  }

  @SubscribeMessage('run.join')
  joinRun(@ConnectedSocket() client: Socket, @MessageBody() body: { workflowRunId?: string }) {
    if (body.workflowRunId) {
      void client.join(this.room(body.workflowRunId));
      return { joined: true };
    }
    return { joined: false };
  }

  emit(eventName: string, payload: RunEventPayload | NodeEventPayload) {
    this.server.to(this.room(payload.workflowRunId)).emit(eventName, payload);
  }

  private room(workflowRunId: string) {
    return `workflow-run:${workflowRunId}`;
  }
}
