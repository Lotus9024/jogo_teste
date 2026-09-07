export function createStatusController(output, { duration = 2800 } = {}) {
  let timer;
  function clear() {
    clearTimeout(timer);
    output.textContent = '';
  }
  function show(message) {
    clearTimeout(timer);
    output.textContent = String(message ?? '');
    timer = setTimeout(clear, duration);
  }
  return { show, clear, dispose: clear };
}
