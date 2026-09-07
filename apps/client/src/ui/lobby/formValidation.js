export function validateLobbyForm(form, output) {
  let firstInvalid = null;
  let message = '';
  for (const input of form.querySelectorAll('input:not([type="radio"])')) {
    const value = input.type === 'password' ? input.value : input.value.trim();
    const invalid = (input.required && !value)
      || (value && input.minLength > 0 && value.length < input.minLength)
      || (input.maxLength > 0 && value.length > input.maxLength);
    input.setAttribute('aria-invalid', String(Boolean(invalid)));
    if (!invalid) {
      if (input.getAttribute('aria-describedby') === output.id) input.removeAttribute('aria-describedby');
      continue;
    }
    input.setAttribute('aria-describedby', output.id);
    if (!firstInvalid) {
      firstInvalid = input;
      const label = form.querySelector(`label[for="${input.id}"]`)?.textContent ?? 'Campo';
      message = !value ? `Preencha ${label.toLocaleLowerCase('pt-BR')}.`
        : `${label}: use entre ${input.minLength > 0 ? input.minLength : 1} e ${input.maxLength} caracteres.`;
    }
  }
  output.textContent = message;
  firstInvalid?.focus();
  return !firstInvalid;
}
