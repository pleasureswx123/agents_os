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
    const jobId = job.retryNodeRunId
      ? `${job.workflowRunId}__retry__${job.retryNodeRunId}`
      : job.continueAfterNodeRunId
        ? `${job.workflowRunId}__continue__${job.continueAfterNodeRunId}`
        : job.workflowRunId;
    return this.queue.add('execute', job, {
      jobId,
      removeOnComplete: 100,
      removeOnFail: 100
    });
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
