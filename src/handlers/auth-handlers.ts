import { Request, ResponseToolkit } from "@hapi/hapi";
import * as Boom from "@hapi/boom";
import { ValidationError, ValidationErrorItem } from "joi";
import {
  buildInternalServerError,
  buildInvalidAttributeError,
} from "./error-utils";
import { SequelizeClient } from "../brokers/sequelize-client";
import { ec } from "elliptic";
import { getKeyPairFromPrivateKey } from "../utils/key-utils";
import { ApiSettings, Participant } from "../types";
import { getParticipantByPublicKey } from "../brokers/paticipants-broker";
import jwt from "jsonwebtoken";

export const authTokenValidationFailAction = (
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

export const authTokenRequestHandler =
  (sequelizeClient: SequelizeClient, apiSettings: ApiSettings) =>
  async (request: Request, h: ResponseToolkit) => {
    const payload = request.payload as { privateKey: string };

    const { privateKey } = payload;

    const keyPair: ec.KeyPair = getKeyPairFromPrivateKey(privateKey);
    const publicKey: string = keyPair.getPublic("hex");

    let participant: Participant;
    try {
      participant = await getParticipantByPublicKey(sequelizeClient, publicKey);
    } catch (error) {
      console.error(error.message);
      return h
        .response({
          errors: [buildInternalServerError()],
        })
        .code(500);
    }

    const { jwtSecretKey } = apiSettings;

    try {
      const accessToken = jwt.sign(
        {
          participantId: participant.id,
        },
        jwtSecretKey,
        { expiresIn: "1h" }
      );

      return {
        access: accessToken,
      };
    } catch (error) {
      console.error(error.message);
      return h
        .response({
          errors: [buildInternalServerError()],
        })
        .code(500);
    }
  };
