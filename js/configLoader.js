export async function loadConfig() {
  const response = await fetch('config.json');
  const config = await response.json();
  return config.UPLOAD_API_URL;
}