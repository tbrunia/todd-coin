import { Server } from "@hapi/hapi";
import { SequelizeClient } from "../brokers/sequelize-client";
import {
  GET_BLOCK_TRANSACTION_PARAMETERS_SCHEMA,
  GET_BLOCK_TRANSACTIONS_PARAMETERS_SCHEMA,
  GET_BLOCK_TRANSACTIONS_QUERY_SCHEMA,
} from "./validation-schemas";
import {
  getBlockTransactionRequestHandler,
  getBlockTransactionsRequestHandler,
  getBlockTransactionsValidationFailAction,
  getBlockTransactionValidationFailAction,
} from "../handlers/block-transactions-handlers";
import { ApiSettings } from "../types";

export const addBlockTransactionsRoutes = (
  server: Server,
  sequelizeClient: SequelizeClient,
  apiSettings: ApiSettings
): void => {
  server.route({
    method: "GET",
    path: "/blocks/{blockId}/transactions",
    options: {
      auth: "custom",
      validate: {
        query: GET_BLOCK_TRANSACTIONS_QUERY_SCHEMA,
        params: GET_BLOCK_TRANSACTIONS_PARAMETERS_SCHEMA,
        options: {
          abortEarly: false,
        },
        failAction: getBlockTransactionsValidationFailAction,
      },
    },
    handler: getBlockTransactionsRequestHandler(sequelizeClient, apiSettings),
  });

  server.route({
    method: "GET",
    path: "/blocks/{blockId}/transactions/{blockTransactionId}",
    options: {
      auth: "custom",
      validate: {
        params: GET_BLOCK_TRANSACTION_PARAMETERS_SCHEMA,
        options: {
          abortEarly: false,
        },
        failAction: getBlockTransactionValidationFailAction,
      },
    },
    handler: getBlockTransactionRequestHandler(sequelizeClient, apiSettings),
  });
};
