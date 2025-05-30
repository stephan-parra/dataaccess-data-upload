export async function loadConfig() {
  const configUrl = new URL('../config.json', import.meta.url);
  const response = await fetch(configUrl);
  const config = await response.json();
  return config;
}