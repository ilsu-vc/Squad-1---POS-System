/**
 * Validate password complexity requirements.
 * Returns an array of error messages (empty if password is valid).
 *
 * Rules:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 number
 */
export function validatePasswordComplexity(password: string): string[] {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least 1 uppercase letter.');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least 1 number.');
  }

  return errors;
}
