/**
 * ID Generator Utility
 *
 * Generates unique identifiers for models.
 */

/**
 * Generates a unique ID string
 * Uses timestamp + random string for uniqueness
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  const id = `${timestamp}-${randomPart}`;
  return prefix ? `${prefix}-${id}` : id;
}
