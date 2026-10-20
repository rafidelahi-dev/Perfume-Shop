// Mirrors the Supabase Auth password policy (lower, upper, digit, symbol) so
// people see what is missing before the server rejects the password.
export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRule = { id: string; label: string; ok: boolean };

export function passwordRules(password: string): PasswordRule[] {
  return [
    { id: "length", label: `${PASSWORD_MIN_LENGTH}+ characters`, ok: password.length >= PASSWORD_MIN_LENGTH },
    { id: "lower", label: "A lowercase letter", ok: /[a-z]/.test(password) },
    { id: "upper", label: "An uppercase letter", ok: /[A-Z]/.test(password) },
    { id: "digit", label: "A number", ok: /[0-9]/.test(password) },
    { id: "symbol", label: "A symbol (e.g. ! @ # $ %)", ok: /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/.test(password) },
  ];
}

export function isStrongPassword(password: string) {
  return passwordRules(password).every((r) => r.ok);
}

/** Turns Supabase's raw policy error into a short, readable sentence. */
export function friendlyAuthError(message: string) {
  if (/password should contain at least one character/i.test(message)) {
    return "Your password needs a lowercase letter, an uppercase letter, a number and a symbol.";
  }
  if (/password should be at least/i.test(message)) {
    return `Your password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  return message;
}
