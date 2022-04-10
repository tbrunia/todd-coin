export const getDatabaseSettings = (): {
  database: string;
  username: string;
  password: string;
  dbHost: string;
  dbPort: number;
} => {
  const database = process.env.DB_NAME || "todd-coin";
  const username = process.env.DB_USERNAME || "postgres";
  const password = process.env.DB_PASSWORD || "secret";
  const dbHost = process.env.DB_HOST || "localhost";
  const dbPort = Number(process.env.DB_PORT) || 5432;

  return { database, username, password, dbHost, dbPort };
};

export const getApiSettings = (): {
  jwtSecretKey: string;
  apiHost: string;
  apiPort: number;
} => {
  const jwtSecretKey =
    process.env.JWT_SIGNING_SECRET || "all your base are belong to us";
  const apiHost = process.env.API_HOST || "localhost";
  const apiPort = Number(process.env.API_PORT) || 3000;

  return {
    jwtSecretKey,
    apiHost,
    apiPort,
  };
};
