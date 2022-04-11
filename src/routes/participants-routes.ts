import { Server } from "@hapi/hapi";
import { SequelizeClient } from "../brokers/sequelize-client";
import {
  GET_PARTICIPANT_PARAMETERS_SCHEMA,
  GET_PARTICIPANTS_QUERY_SCHEMA,
  POST_PARTICIPANT_SCHEMA,
} from "./validation-schemas";
import {
  getParticipantRequestHandler,
  getParticipantsRequestHandler,
  getParticipantsValidationFailAction,
  getParticipantValidationFailAction,
  postParticipantRequestHandler,
  postParticipantValidationFailAction,
} from "../handlers/participant-handlers";
import { ApiSettings } from "../types";

export const addParticipantRoutes = (
  server: Server,
  sequelizeClient: SequelizeClient,
  apiSettings: ApiSettings
): void => {
  server.route({
    method: "GET",
    path: "/participants",
    options: {
      auth: "custom",
      validate: {
        query: GET_PARTICIPANTS_QUERY_SCHEMA,
        options: {
          abortEarly: false,
        },
        failAction: getParticipantsValidationFailAction,
      },
    },
    handler: getParticipantsRequestHandler(sequelizeClient, apiSettings),
  });

  server.route({
    method: "GET",
    path: "/participants/{participantId}",
    options: {
      auth: "custom",
      validate: {
        params: GET_PARTICIPANT_PARAMETERS_SCHEMA,
        options: {
          abortEarly: false,
        },
        failAction: getParticipantValidationFailAction,
      },
    },
    handler: getParticipantRequestHandler(sequelizeClient, apiSettings),
  });

  server.route({
    method: "POST",
    path: "/participants",
    options: {
      auth: "custom",
      validate: {
        payload: POST_PARTICIPANT_SCHEMA,
        options: {
          abortEarly: false,
        },
        failAction: postParticipantValidationFailAction,
      },
    },
    handler: postParticipantRequestHandler(sequelizeClient, apiSettings),
  });
};
