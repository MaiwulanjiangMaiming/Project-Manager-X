interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

class WebviewRPC {
  private pending = new Map<string, PendingRequest>();
  private vscode: any;

  constructor(vscodeApi: any) {
    this.vscode = vscodeApi;
  }

  send(type: string, data?: any): void {
    this.vscode.postMessage({ type, data });
  }

  async call(type: string, data?: any, timeout = 5000): Promise<any> {
    const id = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.vscode.postMessage({ type, data, _rpcId: id });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`RPC timeout: ${type}`));
        }
      }, timeout);
    });
  }

  handleResponse(id: string, result?: any, error?: string): void {
    const pending = this.pending.get(id);
    if (!pending) return;
    this.pending.delete(id);
    if (error) {
      pending.reject(new Error(error));
    } else {
      pending.resolve(result);
    }
  }
}

const vscode = acquireVsCodeApi();

export const rpc = new WebviewRPC(vscode);
