import { Request, ResponseToolkit, ServerAuthSchemeObject } from "@hapi/hapi";
import { ApiSettings, Participant } from "../../types";
import { getParticipantById } from "../../brokers/paticipants-broker";
import { buildUnauthorizedError } from "../error-utils";
import jwt from "jsonwebtoken";
import { SequelizeClient } from "../../brokers/sequelize-client";

export const authenticationScheme =
  (sequelizeClient: SequelizeClient, apiSettings: ApiSettings) =>
  (): ServerAuthSchemeObject => ({
    authenticate: async (request: Request, h: ResponseToolkit) => {
      const accessTokenWithBearer = request.headers["authorization"] as string;

      const BEARER_PREFIX = "bearer ";

      if (
        accessTokenWithBearer === undefined ||
        accessTokenWithBearer.length < BEARER_PREFIX.length
      ) {
        return h
          .response({
            errors: buildUnauthorizedError("Authorization header is required."),
          })
          .code(401)
          .takeover();
      }

      const accessToken = accessTokenWithBearer.substring(BEARER_PREFIX.length);

      const { jwtSecretKey } = apiSettings;

      try {
        jwt.verify(accessToken, jwtSecretKey);
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: buildUnauthorizedError("Unable to verify token."),
          })
          .code(401)
          .takeover();
      }

      let participantId: string = undefined;
      let exp: number = undefined;
      try {
        const decode = jwt.decode(accessToken) as {
          participantId: string;
          exp: number;
        };
        participantId = decode.participantId;
        exp = decode.exp;
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: buildUnauthorizedError("Unable to decode token."),
          })
          .code(401)
          .takeover();
      }

      if (Math.floor(Date.now() / 1000) > exp) {
        return h
          .response({
            errors: buildUnauthorizedError("Token is expired"),
          })
          .code(401)
          .takeover();
      }

      let participant: Participant;
      try {
        participant = await getParticipantById(sequelizeClient, participantId);
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: buildUnauthorizedError(
              `Unable to get participant with id: ${participantId}.`
            ),
          })
          .code(401)
          .takeover();
      }

      if (participant === undefined) {
        return h
          .response({
            errors: buildUnauthorizedError(
              `Participant with id: ${participantId} was not found.`
            ),
          })
          .code(401)
          .takeover();
      }

      return h.authenticated({ credentials: { participant } });
    },
  });
