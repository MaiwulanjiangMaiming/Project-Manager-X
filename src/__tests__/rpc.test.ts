import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let postMessageMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  postMessageMock = vi.fn();
  (globalThis as any).acquireVsCodeApi = vi.fn(() => ({
    postMessage: postMessageMock,
    getState: vi.fn(),
    setState: vi.fn(),
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Helper to reload the module so it picks up the fresh global mock
async function loadRpc() {
  const module = await import('../webview/rpc/webviewRPC?bust=' + Date.now());
  return module.rpc;
}

describe('WebviewRPC', () => {
  it('send should call postMessage with type and data', async () => {
    const rpc = await loadRpc();
    rpc.send('testEvent', { foo: 'bar' });
    expect(postMessageMock).toHaveBeenCalledWith({
      type: 'testEvent',
      data: { foo: 'bar' },
    });
  });

  it('call should send message with _rpcId', async () => {
    const rpc = await loadRpc();
    const promise = rpc.call('testCall', { value: 42 });
    expect(postMessageMock).toHaveBeenCalledOnce();
    const sent = postMessageMock.mock.calls[0][0];
    expect(sent.type).toBe('testCall');
    expect(sent.data).toEqual({ value: 42 });
    expect(typeof sent._rpcId).toBe('string');
    // resolve to avoid unhandled promise
    rpc.handleResponse(sent._rpcId, 'ok');
    await expect(promise).resolves.toBe('ok');
  });

  it('call should resolve when response is received', async () => {
    const rpc = await loadRpc();
    const promise = rpc.call('getData', { id: 1 });
    const sent = postMessageMock.mock.calls[0][0];
    rpc.handleResponse(sent._rpcId, { result: 'success' });
    await expect(promise).resolves.toEqual({ result: 'success' });
  });

  it('call should reject when error response is received', async () => {
    const rpc = await loadRpc();
    const promise = rpc.call('failCall');
    const sent = postMessageMock.mock.calls[0][0];
    rpc.handleResponse(sent._rpcId, undefined, {
      code: 'UNKNOWN',
      message: 'Something went wrong',
    });
    await expect(promise).rejects.toThrow('Something went wrong');
  });

  it('call should reject after timeout', async () => {
    vi.useFakeTimers();
    const rpc = await loadRpc();
    const promise = rpc.call('slowCall', undefined, 3000);
    expect(postMessageMock).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(3000);
    await expect(promise).rejects.toThrow('Operation "slowCall" timed out');
    vi.useRealTimers();
  });

  it('handleResponse should not throw for unknown id', async () => {
    const rpc = await loadRpc();
    expect(() => rpc.handleResponse('non-existent-id', 'data')).not.toThrow();
  });
});
