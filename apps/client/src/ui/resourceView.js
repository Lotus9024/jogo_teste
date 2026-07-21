export function setResource(selector, value, max) {
  const element = document.querySelector(selector);
  element.textContent = String(value);
  if (max === '') return;
  const limit = document.createElement('em');
  limit.textContent = `/${max}`;
  element.appendChild(limit);
}
