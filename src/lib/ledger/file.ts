export function ensureFileExtension(name: string, extension: string): string {
  const trimmedName = name.trim();
  const normalizedExtension = extension.startsWith(".")
    ? extension
    : `.${extension}`;

  return trimmedName.toLowerCase().endsWith(normalizedExtension.toLowerCase())
    ? trimmedName
    : `${trimmedName}${normalizedExtension}`;
}
