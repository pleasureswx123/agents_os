import { Module } from '@nestjs/common';
import { RunEventsGateway } from './run-events.gateway';

@Module({
  providers: [RunEventsGateway],
  exports: [RunEventsGateway]
})
export class RunEventsModule {}
