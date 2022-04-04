export const getDatabaseSettings = (): {
  database: string;
  username: string;
  password: string;
  host: string;
  port: number;
} => {
  const database = process.env.DB_NAME || "todd-coin";
  const username = process.env.DB_USERNAME || "postgres";
  const password = process.env.DB_PASSWORD || "secret";
  const host = process.env.DB_HOST || "localhost";
  const port = Number(process.env.DB_PORT) || 5432;

  return { database, username, password, host, port };
};
