import { performance } from "node:perf_hooks";

const REQUEST_COUNT = 10;
const REQUEST_TIMEOUT_MS = 30_000;
const BITS_PER_MEGABIT = 1_000_000;
const BYTES_PER_KILOBYTE = 1_000;
const BYTES_PER_MEGABYTE = 1_000_000;

function printUsage() {
  console.log("Использование:");
  console.log("  npm start -- <URL>");
  console.log("");
  console.log("Пример:");
  console.log("  npm start -- https://example.com/image.jpg");
}

function parseUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Указан некорректный URL.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Поддерживаются только адреса HTTP и HTTPS.");
  }

  return url;
}

function formatBytes(bytes) {
  if (bytes >= BYTES_PER_MEGABYTE) {
    return `${(bytes / BYTES_PER_MEGABYTE).toFixed(2)} МБ`;
  }

  if (bytes >= BYTES_PER_KILOBYTE) {
    return `${(bytes / BYTES_PER_KILOBYTE).toFixed(2)} КБ`;
  }

  return `${bytes} Б`;
}

async function downloadOnce(url, requestNumber) {
  const startedAt = performance.now();

  const response = await fetch(url, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      "User-Agent": "internet-speed-test/1.0.0"
    }
  });

  // Читаем тело целиком: измерение заканчивается не при получении заголовков,
  // а после загрузки всего ответа.
  const body = await response.arrayBuffer();
  const durationMs = performance.now() - startedAt;
  const downloadedBytes = body.byteLength;

  if (!response.ok) {
    throw new Error(
      `Запрос №${requestNumber}: сервер вернул HTTP ${response.status} ${response.statusText}.`
    );
  }

  return {
    requestNumber,
    durationMs,
    downloadedBytes
  };
}

function printResults(results, totalDurationMs) {
  const totalBytes = results.reduce(
    (sum, result) => sum + result.downloadedBytes,
    0
  );

  const totalRequestDurationMs = results.reduce(
    (sum, result) => sum + result.durationMs,
    0
  );

  const averageDurationMs = totalRequestDurationMs / results.length;

  // Скорость рассчитывается по суммарному объёму и общему времени теста.
  // Мегабит = 1 000 000 бит.
  const downloadSpeedMbps =
    totalDurationMs > 0
      ? (totalBytes * 8) / (totalDurationMs / 1_000) / BITS_PER_MEGABIT
      : 0;

  console.log("");
  console.log("========== РЕЗУЛЬТАТЫ ==========");
  console.log(`Выполнено запросов:       ${results.length}`);
  console.log(`Общий объём данных:       ${formatBytes(totalBytes)}`);
  console.log(`Среднее время запроса:    ${averageDurationMs.toFixed(2)} мс`);
  console.log(`Суммарное время запросов: ${(totalRequestDurationMs / 1_000).toFixed(2)} с`);
  console.log(`Общее время выполнения:   ${(totalDurationMs / 1_000).toFixed(2)} с`);
  console.log(`Скорость загрузки:        ${downloadSpeedMbps.toFixed(2)} Мбит/с`);
  console.log("================================");
}

async function main() {
  const input = process.argv[2];

  if (!input) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  let url;

  try {
    url = parseUrl(input);
  } catch (error) {
    console.error(`Ошибка: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  console.log("Тестирование скорости загрузки");
  console.log(`Адрес: ${url.href}`);
  console.log(`Количество запросов: ${REQUEST_COUNT}`);
  console.log("");

  const results = [];
  const testStartedAt = performance.now();

  try {
    for (let requestNumber = 1; requestNumber <= REQUEST_COUNT; requestNumber += 1) {
      console.log(`[${requestNumber}/${REQUEST_COUNT}] Загрузка...`);

      const result = await downloadOnce(url, requestNumber);
      results.push(result);

      console.log(
        `  Готово: ${formatBytes(result.downloadedBytes)}, ${result.durationMs.toFixed(2)} мс`
      );
    }
  } catch (error) {
    console.error("");
    console.error(`Тест прерван: ${error.name === "TimeoutError" ? "превышено время ожидания ответа." : error.message}`);

    if (error.name === "AbortError") {
      console.error("Запрос был отменён.");
    }

    process.exitCode = 1;
    return;
  }

  const totalDurationMs = performance.now() - testStartedAt;
  printResults(results, totalDurationMs);
}

main().catch((error) => {
  console.error(`Непредвиденная ошибка: ${error.message}`);
  process.exitCode = 1;
});
