// Shared focus ownership for existing DOM overlays; no gameplay state lives here.
export function createModalFocus(modal, { onEscape } = {}) {
  let previousFocus = null;
  let isolated = [];
  let active = false;
  const focusable = () => [...modal.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(element => !element.disabled && !element.hidden && element.getClientRects().length);

  function handleKey(event) {
    if (!active) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      onEscape?.();
    } else if (event.key === 'Tab') {
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (!first) { event.preventDefault(); modal.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    }
  }

  function activate(initialFocus) {
    if (active) return;
    active = true;
    previousFocus = document.activeElement;
    for (let branch = modal; branch && branch !== document.body; branch = branch.parentElement) {
      for (const sibling of branch.parentElement?.children ?? []) {
        if (sibling === branch || sibling.tagName === 'SCRIPT') continue;
        isolated.push([sibling, sibling.inert]);
        sibling.inert = true;
      }
    }
    document.addEventListener('keydown', handleKey, true);
    (initialFocus ?? focusable()[0])?.focus();
  }

  function deactivate() {
    if (!active) return;
    active = false;
    document.removeEventListener('keydown', handleKey, true);
    for (const [element, wasInert] of isolated) element.inert = wasInert;
    isolated = [];
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }

  return { activate, deactivate };
}
