import { Server } from "@hapi/hapi";
import { SequelizeClient } from "../brokers/sequelize-client";
import {
  GET_PENDING_TRANSACTION_PARAMETERS_SCHEMA,
  GET_PENDING_TRANSACTIONS_QUERY_SCHEMA,
  POST_PENDING_TRANSACTION_SCHEMA,
} from "./validation-schemas";
import {
  getPendingTransactionRequestHandler,
  getPendingTransactionsRequestHandler,
  getPendingTransactionsValidationFailAction,
  getPendingTransactionValidationFailAction,
  postPendingTransactionRequestHandler,
  postPendingTransactionValidationFailAction,
} from "../handlers/pending-transactions-handlers";
import { ApiSettings } from "../types";

export const addPendingTransactionsRoutes = (
  server: Server,
  sequelizeClient: SequelizeClient,
  apiSettings: ApiSettings
): void => {
  server.route({
    method: "GET",
    path: "/pending-transactions",
    options: {
      auth: "custom",
      validate: {
        query: GET_PENDING_TRANSACTIONS_QUERY_SCHEMA,
        options: {
          abortEarly: false,
        },
        failAction: getPendingTransactionsValidationFailAction,
      },
    },
    handler: getPendingTransactionsRequestHandler(sequelizeClient, apiSettings),
  });

  server.route({
    method: "GET",
    path: "/pending-transactions/{pendingTransactionId}",
    options: {
      auth: "custom",
      validate: {
        params: GET_PENDING_TRANSACTION_PARAMETERS_SCHEMA,
        options: {
          abortEarly: false,
        },
        failAction: getPendingTransactionValidationFailAction,
      },
    },
    handler: getPendingTransactionRequestHandler(sequelizeClient, apiSettings),
  });

  server.route({
    method: "POST",
    path: "/pending-transactions",
    options: {
      auth: "custom",
      validate: {
        payload: POST_PENDING_TRANSACTION_SCHEMA,
        options: {
          abortEarly: false,
        },
        failAction: postPendingTransactionValidationFailAction,
      },
    },
    handler: postPendingTransactionRequestHandler(sequelizeClient, apiSettings),
  });
};
