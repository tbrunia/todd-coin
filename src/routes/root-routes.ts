import { Server } from "@hapi/hapi";
import { getRoot } from "../handlers/root-handlers";
import { ApiSettings } from "../types";
import { SequelizeClient } from "../brokers/sequelize-client";

export const addRootRoutes = (
  server: Server,
  sequelizeClient: SequelizeClient,
  apiSettings: ApiSettings
): void => {
  server.route({
    method: "GET",
    path: "/",
    handler: getRoot(sequelizeClient, apiSettings),
  });
};
