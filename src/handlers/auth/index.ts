import { authenticationScheme } from "./authentication-scheme";
import { Server } from "@hapi/hapi";
import { SequelizeClient } from "../../brokers/sequelize-client";
import { ApiSettings } from "../../types";

export const addAuth = (
  server: Server,
  sequelizeClient: SequelizeClient,
  apiSettings: ApiSettings
) => {
  server.auth.scheme(
    "custom",
    authenticationScheme(sequelizeClient, apiSettings)
  );

  server.auth.strategy("custom", "custom");
};
