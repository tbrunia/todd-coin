import { Server } from "@hapi/hapi";
import { SequelizeClient } from "../brokers/sequelize-client";
import {
  GET_NODE_PARAMETERS_SCHEMA,
  GET_NODES_QUERY_SCHEMA,
  POST_NODE_SCHEMA,
} from "./validation-schemas";
import {
  getNodeRequestHandler,
  getNodesRequestHandler,
  getNodesValidationFailAction,
  getNodeValidationFailAction,
  postNodeRequestHandler,
  postNodeValidationFailAction,
} from "../handlers/node-handlers";
import { ApiSettings } from "../types";

export const addNodesRoutes = (
  server: Server,
  sequelizeClient: SequelizeClient,
  apiSettings: ApiSettings
): void => {
  server.route({
    method: "GET",
    path: "/nodes",
    options: {
      auth: "custom",
      validate: {
        query: GET_NODES_QUERY_SCHEMA,
        options: {
          abortEarly: false,
        },
        failAction: getNodesValidationFailAction,
      },
    },
    handler: getNodesRequestHandler(sequelizeClient, apiSettings),
  });

  server.route({
    method: "GET",
    path: "/nodes/{nodeId}",
    options: {
      auth: "custom",
      validate: {
        params: GET_NODE_PARAMETERS_SCHEMA,
        options: {
          abortEarly: false,
        },
        failAction: getNodeValidationFailAction,
      },
    },
    handler: getNodeRequestHandler(sequelizeClient, apiSettings),
  });

  server.route({
    method: "POST",
    path: "/nodes",
    options: {
      auth: "custom",
      validate: {
        payload: POST_NODE_SCHEMA,
        options: {
          abortEarly: false,
        },
        failAction: postNodeValidationFailAction,
      },
    },
    handler: postNodeRequestHandler(sequelizeClient, apiSettings),
  });
};
