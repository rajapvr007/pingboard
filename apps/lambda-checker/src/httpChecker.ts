import { CheckJobMessage, ExecutionResult } from "./types";
import { config } from "./config";

/**
 * Performs HTTP health check with latency measurement and retry logic.
 * Retries on network failure or unexpected status code before marking check failed.
 */
export async function performCheck(
  job: CheckJobMessage,
  fetchFn: typeof fetch = fetch
): Promise<ExecutionResult> {
  const timeoutMs = job.timeoutMs || config.defaultTimeoutMs;
  let attempts = 0;
  let lastStatusCode = 0;
  let lastResponseTime = 0;
  let lastErrorMessage: string | null = null;

  while (attempts <= config.maxRetries) {
    attempts++;
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    const startTime = performance.now();
    try {
      const response = await fetchFn(job.url, {
        method: job.httpMethod,
        signal: controller.signal,
        headers: {
          "User-Agent": "PingBoard-HealthChecker/1.0",
        },
      });

      lastResponseTime = Math.round(performance.now() - startTime);
      lastStatusCode = response.status;

      if (lastStatusCode === job.expectedStatusCode) {
        clearTimeout(timerId);
        return {
          statusCode: lastStatusCode,
          responseTimeMs: lastResponseTime,
          isUp: true,
          errorMessage: null,
          attempts,
        };
      }

      lastErrorMessage = `Expected HTTP ${job.expectedStatusCode}, but received ${lastStatusCode}`;
    } catch (err: any) {
      lastResponseTime = Math.round(performance.now() - startTime);
      if (err.name === "AbortError" || err.code === "ABORT_ERR") {
        lastStatusCode = 0;
        lastErrorMessage = `Connection timed out after ${timeoutMs}ms`;
      } else {
        lastStatusCode = 0;
        lastErrorMessage = err.message || "Network request failed";
      }
    } finally {
      clearTimeout(timerId);
    }

    // Brief delay before retry if more attempts remain
    if (attempts <= config.maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return {
    statusCode: lastStatusCode,
    responseTimeMs: lastResponseTime,
    isUp: false,
    errorMessage: lastErrorMessage,
    attempts,
  };
}
