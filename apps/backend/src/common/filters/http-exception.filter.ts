import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common'
import { Response, Request } from 'express'
import { MulterError } from 'multer'

@Catch(HttpException, MulterError)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException | MulterError, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    if (exception instanceof MulterError) {
      const message =
        exception.code === 'LIMIT_FILE_SIZE'
          ? 'Archivo demasiado grande (max 5MB)'
          : exception.message

      response.status(400).json({
        statusCode: 400,
        message,
        path: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
      })
      return
    }

    const status = exception.getStatus()

    // Extract message - handle both string and object formats from ValidationPipe
    const exceptionResponse = exception.getResponse()
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any).message || 'Ocurrió un error'

    // Return consistent error format
    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    })
  }
}
