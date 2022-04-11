import { ApiSettings, DatabaseSettings } from "./types";
import { GENESIS_PARTICIPANT_ID } from "./constants";

export const getDatabaseSettings = (): DatabaseSettings => {
  const database = process.env.DB_NAME || "todd-coin";
  const username = process.env.DB_USERNAME || "postgres";
  const password = process.env.DB_PASSWORD || "secret";
  const dbHost = process.env.DB_HOST || "localhost";
  const dbPort = Number(process.env.DB_PORT) || 5432;

  return { database, username, password, dbHost, dbPort };
};

export const getApiSettings = (): ApiSettings => {
  const jwtSecretKey =
    process.env.JWT_SIGNING_SECRET || "all your base are belong to us";
  const apiHost = process.env.API_HOST || "localhost";
  const apiPort = Number(process.env.API_PORT) || 3000;
  const apiProtocol = process.env.API_PROTOCOL || "http";
  const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3000";
  const hostMaintainerId =
    process.env.HOST_MAINTAINER_ID || GENESIS_PARTICIPANT_ID;

  return {
    jwtSecretKey,
    apiProtocol,
    apiHost,
    apiPort,
    apiBaseUrl,
    hostMaintainerId,
  };
};
