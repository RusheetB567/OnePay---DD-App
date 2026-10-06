export interface Diagnostic {
  event: "request_completed" | "request_failed";
  requestId: string;
  route: string;
  method: string;
  status: number;
  durationMs: number;
  errorCategory?: string;
}
export interface Observer {
  record(event: Diagnostic): void;
}
export class JsonObserver implements Observer {
  record(event: Diagnostic) {
    console.log(JSON.stringify(event));
  }
}
export class NoopObserver implements Observer {
  record(_event: Diagnostic) {}
}
