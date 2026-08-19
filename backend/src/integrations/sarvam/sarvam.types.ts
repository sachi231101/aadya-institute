export interface SarvamTTSRequest {
  text: string;
  language: string;
  voice?: string;
}

export interface SarvamSTTResponse {
  transcript: string;
  confidence: number;
}

export interface SarvamOutboundCallRequest {
  app_config: {
    app_id: string;
    app_version: number;
    connection_config: {
      connection_id: string;
      agent_phone_number: string;
    };
  };
  user_config: {
    user_phone_number: string;
  };
}

export interface SarvamOutboundCallResponse {
  attempt_id: string;
}

export interface SarvamTranscriptTurn {
  role: "agent" | "user" | "system";
  text: string;
}

export interface SarvamWebhookPayload {
  attempt_id: string;
  customer_number?: string;
  status: "connected" | "no_answer" | "busy" | "failed" | string;
  interaction_id?: string;
  duration?: number;
  interaction_transcript?: SarvamTranscriptTurn[];
  final_agent_variables?: Record<string, any>;
  failure_reason?: string;
}

