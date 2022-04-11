import { Server } from "@hapi/hapi";
import { SequelizeClient } from "../brokers/sequelize-client";
import { addRootRoutes } from "./root-routes";
import { addAuthRoutes } from "./auth-routes";
import { addBlocksRoutes } from "./blocks-routes";
import { addPendingTransactionsRoutes } from "./pending-transactions-routes";
import { addSignedTransactionsRoutes } from "./signed-transactions-routes";
import { addBlockTransactionsRoutes } from "./block-transactions-routes";
import { addParticipantRoutes } from "./participants-routes";
import { addNodesRoutes } from "./nodes-routes";
import { ApiSettings } from "../types";

export const addRoutes = (
  server: Server,
  sequelizeClient: SequelizeClient,
  apiSettings: ApiSettings
): void => {
  addRootRoutes(server, sequelizeClient, apiSettings);
  addAuthRoutes(server, sequelizeClient, apiSettings);
  addBlocksRoutes(server, sequelizeClient, apiSettings);
  addPendingTransactionsRoutes(server, sequelizeClient, apiSettings);
  addSignedTransactionsRoutes(server, sequelizeClient, apiSettings);
  addBlockTransactionsRoutes(server, sequelizeClient, apiSettings);
  addParticipantRoutes(server, sequelizeClient, apiSettings);
  addNodesRoutes(server, sequelizeClient, apiSettings);
};
