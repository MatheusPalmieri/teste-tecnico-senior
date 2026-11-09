function requireEnv(key: string): string {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Variável de ambiente ausente: ${key}`);
  }
  return value;
}

export const env = {
  apiUrl: requireEnv("VITE_API_URL"),
};
