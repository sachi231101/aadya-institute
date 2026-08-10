export interface SarvamTTSRequest {
  text: string;
  language: string;
  voice?: string;
}

export interface SarvamSTTResponse {
  transcript: string;
  confidence: number;
}
