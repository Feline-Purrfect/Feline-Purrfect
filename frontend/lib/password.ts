// Mirrors the server's rule (backend/src/routes/auth.js → assertStrongPassword), so forms only
// enable for a password the API will accept.

export interface PasswordRule {
  label: string;
  ok: boolean;
}

/**
 * The checklist shown under every "set a new password" form.
 * Pass `current` on Change password to add the "different from your current password" rule.
 */
export function passwordRules(
  next: string,
  confirm: string,
  current?: string,
): PasswordRule[] {
  const rules: PasswordRule[] = [
    {
      label: 'At least 8 characters',
      ok: next.length >= 8 && next.length <= 128,
    },
    {
      label: 'Upper- and lower-case letters',
      ok: /[a-z]/.test(next) && /[A-Z]/.test(next),
    },
    {
      label: 'A number and a symbol',
      ok: /\d/.test(next) && /[^A-Za-z0-9]/.test(next),
    },
  ];
  if (current !== undefined) {
    rules.push({
      label: 'Different from your current password',
      ok: next.length > 0 && next !== current,
    });
  }
  rules.push({
    label: 'Both passwords match',
    ok: confirm.length > 0 && confirm === next,
  });
  return rules;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isEmail = (value: string) => EMAIL.test(value.trim());
