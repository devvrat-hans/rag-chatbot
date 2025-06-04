// Deno type declarations for Edge Functions

// Global Deno namespace
declare global {
  namespace Deno {
    export function serve(handler: (req: Request) => Promise<Response> | Response): void;
    export const env: {
      get(key: string): string | undefined;
    };
  }

  interface Request {
    readonly url: string;
    readonly method: string;
    readonly headers: Headers;
    json(): Promise<any>;
  }

  var Response: {
    new (body?: BodyInit | null, init?: ResponseInit): Response;
    prototype: Response;
    error(): Response;
    json(data: any, init?: ResponseInit): Response;
    redirect(url: string | URL, status?: number): Response;
  };

  interface Response {
    readonly status: number;
    readonly statusText: string;
    readonly headers: Headers;
    readonly ok: boolean;
    json(): Promise<any>;
    text(): Promise<string>;
    arrayBuffer(): Promise<ArrayBuffer>;
  }

  interface ResponseInit {
    status?: number;
    statusText?: string;
    headers?: HeadersInit;
  }

  var Headers: {
    new (init?: HeadersInit): Headers;
    prototype: Headers;
  };

  interface Headers {
    get(name: string): string | null;
    set(name: string, value: string): void;
    has(name: string): boolean;
    delete(name: string): void;
    append(name: string, value: string): void;
  }

  function fetch(input: string | Request, init?: RequestInit): Promise<Response>;

  interface RequestInit {
    method?: string;
    headers?: HeadersInit;
    body?: BodyInit | null;
  }

  function setTimeout(callback: (...args: any[]) => void, delay: number, ...args: any[]): number;
  function clearTimeout(id: number): void;
}

export {};
