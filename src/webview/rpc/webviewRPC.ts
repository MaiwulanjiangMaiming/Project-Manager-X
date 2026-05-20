import { RpcError } from './RpcError';

interface PendingRequest<T = unknown> {
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
}

class WebviewRPC {
  private pending = new Map<string, PendingRequest>();
  private vscode: { postMessage: (msg: unknown) => void };

  constructor(vscodeApi: { postMessage: (msg: unknown) => void }) {
    this.vscode = vscodeApi;
  }

  send(type: string, data?: Record<string, unknown>): void {
    this.vscode.postMessage({ type, data });
  }

  async call<T = unknown>(
    type: string,
    data?: Record<string, unknown>,
    timeout = 5000
  ): Promise<T> {
    const id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      this.vscode.postMessage({ type, data, _rpcId: id });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(RpcError.timeout(type));
        }
      }, timeout);
    });
  }

  handleResponse(
    id: string,
    result?: unknown,
    error?: { code: string; message: string; details?: Record<string, unknown> }
  ): void {
    const pending = this.pending.get(id);
    if (!pending) return;
    this.pending.delete(id);
    if (error) {
      pending.reject(new RpcError(error.code, error.message, error.details));
    } else {
      pending.resolve(result);
    }
  }
}

const vscode = acquireVsCodeApi();

export const rpc = new WebviewRPC(vscode);
