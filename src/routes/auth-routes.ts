import { Server } from "@hapi/hapi";
import { AUTH_SCHEMA } from "./validation-schemas";
import {
  authTokenRequestHandler,
  authTokenValidationFailAction,
} from "../handlers/auth-handlers";
import { SequelizeClient } from "../brokers/sequelize-client";
import { ApiSettings } from "../types";

export const addAuthRoutes = (
  server: Server,
  sequelizeClient: SequelizeClient,
  apiSettings: ApiSettings
): void => {
  server.route({
    method: "POST",
    path: "/auth/token",
    options: {
      validate: {
        payload: AUTH_SCHEMA,
        options: {
          abortEarly: false,
        },
        failAction: authTokenValidationFailAction,
      },
    },
    handler: authTokenRequestHandler(sequelizeClient, apiSettings),
  });
};
