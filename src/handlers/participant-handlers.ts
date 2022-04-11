import { SequelizeClient } from "../brokers/sequelize-client";
import { Request, ResponseToolkit } from "@hapi/hapi";
import * as Boom from "@hapi/boom";
import { ValidationError, ValidationErrorItem } from "joi";
import { DEFAULT_PAGE_SIZE, FIRST_PAGE } from "../constants";
import { ApiData, ApiSettings, Participant } from "../types";
import {
  createParticipant,
  getParticipantById,
  getParticipants,
} from "../brokers/paticipants-broker";
import {
  buildParticipantSerializer,
  buildParticipantsSerializer,
} from "./serializer-builders";
import { generateParticipantKey } from "../utils/key-utils";
import {
  buildInternalServerError,
  buildInvalidAttributeError,
  buildInvalidParameterError,
  buildInvalidQueryError,
  buildNofFountError,
} from "./error-utils";

export const getParticipantsValidationFailAction = (
  request: Request,
  h: ResponseToolkit,
  error: (Boom.Boom & ValidationError) | undefined
) => {
  return h
    .response({
      errors: error.details.map((errorItem: ValidationErrorItem) =>
        buildInvalidQueryError(errorItem)
      ),
    })
    .code(error.output.statusCode)
    .takeover();
};

export const getParticipantsRequestHandler =
  (sequelizeClient: SequelizeClient, apiSettings: ApiSettings) =>
  async (request: Request, h: ResponseToolkit) => {
    const pageNumber: number =
      Number(request.query["page[number]"]) || FIRST_PAGE;

    const pageSize: number =
      Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

    const publicKeyFilter: string = request.query["filter[publicKey]"];

    let response: { count: number; rows: Participant[] };
    try {
      response = await getParticipants(
        sequelizeClient,
        pageNumber,
        pageSize,
        publicKeyFilter
      );
    } catch (error) {
      console.error(error.message);
      return h
        .response({
          errors: [buildInternalServerError()],
        })
        .code(500);
    }

    const { count, rows } = response;

    return buildParticipantsSerializer(
      apiSettings,
      count,
      pageNumber,
      pageSize
    ).serialize(rows);
  };

export const getParticipantValidationFailAction = (
  request: Request,
  h: ResponseToolkit,
  error: (Boom.Boom & ValidationError) | undefined
) => {
  return h
    .response({
      errors: error.details.map((errorItem: ValidationErrorItem) =>
        buildInvalidParameterError(errorItem)
      ),
    })
    .code(error.output.statusCode)
    .takeover();
};

export const getParticipantRequestHandler =
  (sequelizeClient: SequelizeClient, apiSettings: ApiSettings) =>
  async (request: Request, h: ResponseToolkit) => {
    const { participantId } = request.params;

    let participant: Participant;
    try {
      participant = await getParticipantById(sequelizeClient, participantId);
    } catch (error) {
      console.error(error.message);
      return h
        .response({
          errors: [buildInternalServerError()],
        })
        .code(500);
    }

    if (participant === undefined) {
      return h
        .response({
          errors: [
            buildNofFountError(
              `A participant with id: ${participantId} was not found.`
            ),
          ],
        })
        .code(404);
    }

    return buildParticipantSerializer(apiSettings).serialize(participant);
  };

export const postParticipantValidationFailAction = (
  request: Request,
  h: ResponseToolkit,
  error: (Boom.Boom & ValidationError) | undefined
) => {
  return h
    .response({
      errors: error.details.map((errorItem: ValidationErrorItem) =>
        buildInvalidAttributeError(errorItem)
      ),
    })
    .code(error.output.statusCode)
    .takeover();
};

export const postParticipantRequestHandler =
  (sequelizeClient: SequelizeClient, apiSettings: ApiSettings) =>
  async (request: Request, h: ResponseToolkit) => {
    const payload = request.payload as { data: ApiData<Participant> };

    // todo - check for dupe participants

    const participantKey = generateParticipantKey();

    const newParticipant = {
      id: payload.data.id,
      ...payload.data.attributes,
      key: { public: participantKey.public },
    };

    let createdParticipant: Participant;
    try {
      createdParticipant = await createParticipant(
        sequelizeClient,
        newParticipant
      );
    } catch (error) {
      console.error(error.message);
      return h
        .response({
          errors: [buildInternalServerError()],
        })
        .code(500);
    }

    // todo - notify known participants that a new participant was added

    return buildParticipantSerializer(apiSettings).serialize({
      ...createdParticipant,
      key: {
        public: createdParticipant.key.public,
        private: participantKey.private,
      },
    });
  };
