/**
 * Centralized WebSocket connection manager for StreamWeaver
 */

const getWsUrl = (jobId) => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  let host = apiUrl.replace(/^http/, "ws").replace(/\/api\/?$/, "");
  return `${host}/ws/jobs/${jobId}`;
};

export class JobWebSocket {
  constructor(jobId, callbacks = {}) {
    this.jobId = jobId;
    this.callbacks = callbacks;
    this.ws = null;
    this.isClosedManually = false;
  }

  connect() {
    if (!this.jobId) return;

    const url = getWsUrl(this.jobId);
    console.log(`[JobWebSocket] Connecting to ${url}`);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log(`[JobWebSocket] Connected for job ${this.jobId}`);
        if (this.callbacks.onConnect) this.callbacks.onConnect();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.callbacks.onMessage) this.callbacks.onMessage(data);
        } catch (err) {
          console.error("[JobWebSocket] Message parse error:", err);
        }
      };

      this.ws.onerror = (err) => {
        console.error("[JobWebSocket] Error:", err);
        if (this.callbacks.onError) this.callbacks.onError(err);
      };

      this.ws.onclose = (event) => {
        console.log(`[JobWebSocket] Closed for job ${this.jobId}`);
        if (this.callbacks.onClose) this.callbacks.onClose(event);
      };
    } catch (err) {
      console.error("[JobWebSocket] Failed to establish socket:", err);
      if (this.callbacks.onError) this.callbacks.onError(err);
    }
  }

  close() {
    this.isClosedManually = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
