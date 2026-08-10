export interface CallRequest {
  to: string;
  from: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
}

export interface CallResponse {
  callId: string;
  status: string;
}
