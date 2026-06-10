import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { map, Observable } from 'rxjs';
import { createRequestId } from '../../main';

type RequestWithId = FastifyRequest & {
  requestId?: string;
};

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<FastifyReply>();
    const requestId = request.headers['x-request-id']?.toString() ?? createRequestId();

    request.requestId = requestId;
    response.header('x-request-id', requestId);

    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && ('data' in data || 'error' in data)) {
          return data;
        }

        return {
          data,
          requestId
        };
      })
    );
  }
}
