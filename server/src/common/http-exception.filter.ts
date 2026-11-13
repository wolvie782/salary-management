import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

// One place that decides what an error response looks like. Known client
// errors pass through with their status; Prisma integrity errors map to
// clean 4xx responses; anything unexpected is logged with full detail on the
// server but answered with a generic 500 so internals never leak to clients.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Error');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      // Body parser failures reach here as 400s whose message echoes parser
      // internals ("... in JSON at position N"); answer those generically.
      const message = (body as { message?: unknown })?.message;
      if (
        status === 400 &&
        typeof message === 'string' &&
        /JSON|Unexpected token|position \d+/.test(message)
      ) {
        res.status(400).json({ statusCode: 400, message: 'Malformed request body' });
        return;
      }
      res.status(status).json(
        typeof body === 'string' ? { statusCode: status, message: body } : body,
      );
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        res
          .status(HttpStatus.CONFLICT)
          .json({ statusCode: 409, message: 'A record with this value already exists', error: 'Conflict' });
        return;
      }
      if (exception.code === 'P2025') {
        res
          .status(HttpStatus.NOT_FOUND)
          .json({ statusCode: 404, message: 'Record not found', error: 'Not Found' });
        return;
      }
    }

    // Framework level client errors (for example malformed JSON from the body
    // parser) arrive as plain objects with a 4xx status, not HttpExceptions.
    const status = (exception as { status?: unknown })?.status;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      res.status(status).json({ statusCode: status, message: 'Bad request' });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ statusCode: 500, message: 'Internal server error' });
  }
}
