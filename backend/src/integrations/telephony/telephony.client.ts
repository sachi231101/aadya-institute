import axios from "axios";
import type { CallRequest, CallResponse } from "./telephony.types";

const telephonyClient = axios.create({
  baseURL: process.env.TELEPHONY_BASE_URL || "",
  headers: {
    Authorization: `Bearer ${process.env.TELEPHONY_API_KEY || ""}`,
  },
});

export const initiateCall = async (req: CallRequest): Promise<CallResponse> => {
  const response = await telephonyClient.post<CallResponse>("/calls", req);
  return response.data;
};

export const hangupCall = async (callId: string): Promise<void> => {
  await telephonyClient.post(`/calls/${callId}/hangup`);
};
