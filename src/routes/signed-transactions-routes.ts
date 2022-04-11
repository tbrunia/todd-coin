import { Server } from "@hapi/hapi";
import { SequelizeClient } from "../brokers/sequelize-client";
import {
  GET_SIGNED_TRANSACTION_PARAMETERS_SCHEMA,
  GET_SIGNED_TRANSACTIONS_QUERY_SCHEMA,
  POST_SIGNED_TRANSACTION_SCHEMA,
} from "./validation-schemas";
import {
  getSignedTransactionRequestHandler,
  getSignedTransactionsRequestHandler,
  getSignedTransactionsValidationFailAction,
  getSignedTransactionValidationFailAction,
  postSignedTransactionRequestHandler,
  postSignedTransactionValidationFailAction,
} from "../handlers/signed-transactions-handlers";
import { ApiSettings } from "../types";

export const addSignedTransactionsRoutes = (
  server: Server,
  sequelizeClient: SequelizeClient,
  apiSettings: ApiSettings
): void => {
  server.route({
    method: "GET",
    path: "/signed-transactions",
    options: {
      auth: "custom",
      validate: {
        query: GET_SIGNED_TRANSACTIONS_QUERY_SCHEMA,
        options: {
          abortEarly: false,
        },
        failAction: getSignedTransactionsValidationFailAction,
      },
    },
    handler: getSignedTransactionsRequestHandler(sequelizeClient, apiSettings),
  });

  server.route({
    method: "GET",
    path: "/signed-transactions/{signedTransactionId}",
    options: {
      auth: "custom",
      validate: {
        params: GET_SIGNED_TRANSACTION_PARAMETERS_SCHEMA,
        options: {
          abortEarly: false,
        },
        failAction: getSignedTransactionValidationFailAction,
      },
    },
    handler: getSignedTransactionRequestHandler(sequelizeClient, apiSettings),
  });

  server.route({
    method: "POST",
    path: "/signed-transactions",
    options: {
      auth: "custom",
      validate: {
        payload: POST_SIGNED_TRANSACTION_SCHEMA,
        options: {
          abortEarly: false,
        },
        failAction: postSignedTransactionValidationFailAction,
      },
    },
    handler: postSignedTransactionRequestHandler(sequelizeClient, apiSettings),
  });
};
