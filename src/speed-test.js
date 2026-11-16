import { performance } from "node:perf_hooks";
import {
  BITS_PER_MEGABIT,
  REQUEST_COUNT,
  REQUEST_TIMEOUT_MS
} from "./config.js";
import { formatBytes } from "./utils.js";

async function downloadOnce(url, requestNumber) {
  const startedAt = performance.now();

  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), 
    headers: {
      "User-Agent": "internet-speed-test/1.1.0"
    }
  });

  if (!response.ok) {
    // Освобождаем ресурсы ответа, если сервер вернул ошибочный HTTP-статус.
    await response.body?.cancel();

    throw new Error(
      `Запрос №${requestNumber}: сервер вернул HTTP ${response.status} ${response.statusText}.`
    );
  }

  // arrayBuffer() завершается только после полной загрузки тела ответа.
  const body = await response.arrayBuffer();

  return {
    requestNumber,
    durationMs: performance.now() - startedAt,
    downloadedBytes: body.byteLength
  };
}

export async function runSpeedTest(url) {
  const results = [];
  const testStartedAt = performance.now();

  for (let requestNumber = 1; requestNumber <= REQUEST_COUNT; requestNumber += 1) {
    console.log(`[${requestNumber}/${REQUEST_COUNT}] Загрузка...`);

    const result = await downloadOnce(url, requestNumber);
    results.push(result);

    console.log(
      `  Готово: ${formatBytes(result.downloadedBytes)}, ${result.durationMs.toFixed(2)} мс`
    );
  }

  const totalDurationMs = performance.now() - testStartedAt;
  const totalBytes = results.reduce(
    (sum, result) => sum + result.downloadedBytes,
    0
  );
  const totalRequestDurationMs = results.reduce(
    (sum, result) => sum + result.durationMs,
    0
  );
  const averageDurationMs = totalRequestDurationMs / results.length;

  // Итоговая скорость: весь полученный объём / полное время теста.
  // 1 Мбит = 1 000 000 бит.
  const downloadSpeedMbps =
    totalDurationMs > 0
      ? (totalBytes * 8) /
        (totalDurationMs / 1_000) /
        BITS_PER_MEGABIT
      : 0;

  return {
    requestCount: results.length,
    totalBytes,
    averageDurationMs,
    totalRequestDurationMs,
    totalDurationMs,
    downloadSpeedMbps
  };
}

export function printResults(result) {
  console.log("");
  console.log("========== РЕЗУЛЬТАТЫ ==========");
  console.log(`Выполнено запросов:       ${result.requestCount}`);
  console.log(`Общий объём данных:       ${formatBytes(result.totalBytes)}`);
  console.log(`Среднее время запроса:    ${result.averageDurationMs.toFixed(2)} мс`);
  console.log(
    `Суммарное время запросов: ${(result.totalRequestDurationMs / 1_000).toFixed(2)} с`
  );
  console.log(
    `Общее время выполнения:   ${(result.totalDurationMs / 1_000).toFixed(2)} с`
  );
  console.log(`Скорость загрузки:        ${result.downloadSpeedMbps.toFixed(2)} Мбит/с`);
  console.log("================================");
}
