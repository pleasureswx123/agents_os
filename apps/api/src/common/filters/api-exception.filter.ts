import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { createRequestId } from '../../main';

type RequestWithId = FastifyRequest & {
  requestId?: string;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithId>();
    const response = context.getResponse<FastifyReply>();
    const requestId = request.requestId ?? createRequestId();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const details =
        typeof exceptionResponse === 'object' && exceptionResponse !== null
          ? (exceptionResponse as Record<string, unknown>)
          : {};

      response.status(status).send({
        error: {
          code: String(details.code ?? this.defaultCode(status)),
          message: String(details.message ?? exception.message),
          details: details.details ?? {}
        },
        requestId
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: exception instanceof Error ? exception.message : '服务器内部错误',
        details: {}
      },
      requestId
    });
  }

  private defaultCode(status: number) {
    if (status === HttpStatus.UNAUTHORIZED) {
      return 'UNAUTHORIZED';
    }
    if (status === HttpStatus.FORBIDDEN) {
      return 'FORBIDDEN';
    }
    if (status === HttpStatus.BAD_REQUEST) {
      return 'VALIDATION_ERROR';
    }
    return 'API_ERROR';
  }
}
