import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { workflowRunQueueName, type WorkflowRunJob } from '@agents-os/shared';

@Injectable()
export class WorkflowRunsQueue implements OnModuleDestroy {
  private readonly queue = new Queue<WorkflowRunJob>(workflowRunQueueName, {
    connection: {
      url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      maxRetriesPerRequest: null
    }
  });

  async enqueue(job: WorkflowRunJob) {
    return this.queue.add('execute', job, {
      jobId: job.retryNodeRunId ? `${job.workflowRunId}__${job.retryNodeRunId}` : job.workflowRunId,
      removeOnComplete: 100,
      removeOnFail: 100
    });
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
