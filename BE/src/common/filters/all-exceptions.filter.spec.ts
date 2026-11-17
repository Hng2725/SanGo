import { ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';
describe('AllExceptionsFilter', () => {
  const sent: unknown[] = [];
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn((body: unknown) => {
      sent.push(body);
    }),
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => ({ url: '/api/test' }) }),
  } as unknown as ArgumentsHost;
  const filter = new AllExceptionsFilter();
  beforeEach(() => {
    jest.clearAllMocks();
    sent.length = 0;
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());
  it('maps a Prisma unique conflict to 409', () => {
    filter.catch(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '6.19.3',
      }),
      host,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409, code: 'CONFLICT', path: '/api/test' }),
    );
  });
  it('maps a missing record to 404', () => {
    filter.catch(
      new Prisma.PrismaClientKnownRequestError('missing', {
        code: 'P2025',
        clientVersion: '6.19.3',
      }),
      host,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, code: 'NOT_FOUND' }),
    );
  });
  it('does not reveal stacks for unknown errors', () => {
    filter.catch(new Error('secret stack'), host);
    const body = sent[0];
    expect(body).toMatchObject({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Lỗi hệ thống',
    });
    expect(JSON.stringify(body)).not.toContain('secret stack');
  });
  it('maps framework 401 to the public error code', () => {
    filter.catch(new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED), host);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, code: 'UNAUTHORIZED' }),
    );
  });
});
