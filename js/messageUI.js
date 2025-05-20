export function showError(message, container) {
  container.textContent = message;
  container.className = 'submission-message error';
  container.style.display = 'block';
}

export function showSuccess(message, container) {
  container.textContent = message;
  container.className = 'submission-message success';
  container.style.display = 'block';
}