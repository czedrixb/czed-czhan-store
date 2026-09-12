// Single source for the password length rule, shared between server zod
// schemas and client-side inline validation - previously the `6` literal was
// duplicated across three zod schemas and three client expressions, so
// tightening or loosening the rule meant hunting down every copy.
export const PASSWORD_MIN_LENGTH = 6
export const PASSWORD_MAX_LENGTH = 200

/** Inline validation message for a single password field, or null if it's fine. */
export function passwordLengthError(password: string): string | null {
  if (password.length === 0) return null
  if (password.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters`
  if (password.length > PASSWORD_MAX_LENGTH) return `Use at most ${PASSWORD_MAX_LENGTH} characters`
  return null
}

/** Inline validation message when a confirmation field doesn't match, or null if it does. */
export function passwordMismatchError(password: string, confirmation: string): string | null {
  if (confirmation.length === 0) return null
  return password === confirmation ? null : 'Passwords do not match'
}
