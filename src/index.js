import { DEFAULT_URL, REQUEST_COUNT } from "./config.js";
import { parseUrl } from "./utils.js";
import { printResults, runSpeedTest } from "./speed-test.js";

async function main() {
  // Если URL передан аргументом, используем его. Иначе берём URL по умолчанию.
  const input = process.argv[2] ?? DEFAULT_URL;

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

  try {
    const result = await runSpeedTest(url);
    printResults(result);
  } catch (error) {
    console.error("");
    if (error.name === "TimeoutError") {
      console.error("Тест прерван: превышено время ожидания ответа (30 секунд).");
    } else {
      console.error(`Тест прерван: ${error.message}`);
    }

    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`Непредвиденная ошибка: ${error.message}`);
  process.exitCode = 1;
});
