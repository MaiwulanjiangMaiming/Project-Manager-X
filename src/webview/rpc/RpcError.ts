export class RpcError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RpcError';
  }

  static notFound(resource: string, id?: string): RpcError {
    return new RpcError('NOT_FOUND', `${resource}${id ? ` "${id}"` : ''} not found`);
  }

  static invalidInput(message: string): RpcError {
    return new RpcError('INVALID_INPUT', message);
  }

  static timeout(operation: string): RpcError {
    return new RpcError('TIMEOUT', `Operation "${operation}" timed out`);
  }

  static unknown(message: string): RpcError {
    return new RpcError('UNKNOWN', message);
  }
}
