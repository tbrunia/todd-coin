import { Server } from "@hapi/hapi";
import { SequelizeClient } from "../brokers/sequelize-client";
import {
  GET_BLOCK_PARAMETERS_SCHEMA,
  GET_BLOCKS_QUERY_SCHEMA,
  POST_BLOCK_SCHEMA,
} from "./validation-schemas";
import {
  getBlockRequestHandler,
  getBlocksRequestHandler,
  getBlocksValidationFailAction,
  getBlockValidationFailAction,
  postBlockRequestHandler,
  postBlockValidationFailAction,
} from "../handlers/blocks-handlers";
import { ApiSettings } from "../types";

export const addBlocksRoutes = (
  server: Server,
  sequelizeClient: SequelizeClient,
  apiSettings: ApiSettings
): void => {
  server.route({
    method: "GET",
    path: "/blocks",
    options: {
      auth: "custom",
      validate: {
        query: GET_BLOCKS_QUERY_SCHEMA,
        options: {
          abortEarly: false,
        },
        failAction: getBlocksValidationFailAction,
      },
    },
    handler: getBlocksRequestHandler(sequelizeClient, apiSettings),
  });

  server.route({
    method: "GET",
    path: "/blocks/{blockId}",
    options: {
      auth: "custom",
      validate: {
        params: GET_BLOCK_PARAMETERS_SCHEMA,
        options: {
          abortEarly: false,
        },
        failAction: getBlockValidationFailAction,
      },
    },
    handler: getBlockRequestHandler(sequelizeClient, apiSettings),
  });

  server.route({
    method: "POST",
    path: "/blocks",
    options: {
      auth: "custom",
      validate: {
        payload: POST_BLOCK_SCHEMA,
        options: {
          abortEarly: false,
        },
        failAction: postBlockValidationFailAction,
      },
    },
    handler: postBlockRequestHandler(sequelizeClient, apiSettings),
  });
};
