import axios from "axios";
import type { SarvamTTSRequest } from "./sarvam.types";

const SARVAM_BASE_URL = "https://api.sarvam.ai/v1";

const sarvamClient = axios.create({
  baseURL: SARVAM_BASE_URL,
  headers: {
    "api-subscription-key": process.env.SARVAM_API_KEY || "",
  },
});

export const textToSpeech = async (req: SarvamTTSRequest): Promise<Buffer> => {
  const response = await sarvamClient.post("/text-to-speech", req, {
    responseType: "arraybuffer",
  });
  return Buffer.from(response.data);
};

export const speechToText = async (audioBuffer: Buffer): Promise<string> => {
  const formData = new FormData();
  const arrayBuffer = audioBuffer.buffer.slice(
    audioBuffer.byteOffset,
    audioBuffer.byteOffset + audioBuffer.byteLength
  ) as ArrayBuffer;
  formData.append("file", new Blob([arrayBuffer]), "audio.wav");

  const response = await sarvamClient.post("/speech-to-text", formData);
  return response.data.transcript;
};
