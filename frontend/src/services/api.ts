import axios from "axios";
import { useAuthStore } from "../store/auth.store";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // #region agent log
    const url = String(response.config?.url || "");
    if (/students|feedback|attendance|discontinuation|reports\/students|class-sessions\/active/i.test(url)) {
      fetch('http://127.0.0.1:7718/ingest/08e84414-f55c-4158-b0fe-c889777883d7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c11d90'},body:JSON.stringify({sessionId:'c11d90',runId:'student-e2e',hypothesisId:'B,C,E',location:'api.ts:response',message:'student-related API success',data:{method:response.config?.method,url,status:response.status,hasData:!!response.data,dataKeys:response.data&&typeof response.data==='object'?Object.keys(response.data):[]},timestamp:Date.now()})}).catch(()=>{});
    }
    // #endregion
    return response;
  },
  (error) => {
    // #region agent log
    const url = String(error.config?.url || "");
    if (/students|feedback|attendance|discontinuation|reports\/students|class-sessions\/active/i.test(url) || !url) {
      fetch('http://127.0.0.1:7718/ingest/08e84414-f55c-4158-b0fe-c889777883d7',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c11d90'},body:JSON.stringify({sessionId:'c11d90',runId:'student-e2e',hypothesisId:'B,C,E',location:'api.ts:error',message:'student-related API error',data:{method:error.config?.method,url,status:error.response?.status,errMsg:error.response?.data?.message||error.message},timestamp:Date.now()})}).catch(()=>{});
    }
    // #endregion
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);
