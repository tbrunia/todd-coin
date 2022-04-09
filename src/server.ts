"use strict";

import { ApiData, Block, Node, Participant, Transaction } from "./types";
import * as Hapi from "@hapi/hapi";
import {
  Request,
  ResponseToolkit,
  Server,
  ServerAuthSchemeObject,
} from "@hapi/hapi";
import * as Boom from "@hapi/boom";
import {
  DEFAULT_PAGE_SIZE,
  FIRST_PAGE,
  HOST,
  PORT,
  PROTOCOL,
} from "./constants";
import {
  generateParticipantKey,
  getKeyPairFromPrivateKey,
} from "./services/key-utils";
import {
  buildBlockSerializer,
  buildBlocksSerializer,
  buildBlockTransactionSerializer,
  buildBlockTransactionsSerializer,
  buildNodeSerializer,
  buildNodesSerializer,
  buildParticipantSerializer,
  buildParticipantsSerializer,
  buildPendingTransactionSerializer,
  buildPendingTransactionsSerializer,
  buildSignedTransactionSerializer,
  buildSignedTransactionsSerializer,
} from "./services/serializer-builders";
import { SequelizeClient } from "./brokers/sequelize-client";
import { createBlock, getBlockById, getBlocks } from "./brokers/blocks-broker";
import {
  createPendingTransaction,
  createSignedTransaction,
  getBlockTransactionById,
  getBlockTransactions,
  getPendingTransactionById,
  getPendingTransactions,
  getSignedTransactionById,
  getSignedTransactions,
} from "./brokers/transactions-broker";
import {
  createParticipant,
  getParticipantById,
  getParticipantByPublicKey,
  getParticipants,
} from "./brokers/paticipants-broker";
import { createNode, getNodeById, getNodes } from "./brokers/nodes-broker";
import { ec } from "elliptic";
import jwt from "jsonwebtoken";
import { getServerSecret } from "./environment-utils";
import { ValidationErrorItem } from "joi";
import {
  AUTH_SCHEMA,
  BLOCK_ID_SCHEMA,
  BLOCK_SCHEMA,
  NODE_SCHEMA,
  PARTICIPANT_SCHEMA,
  PENDING_TRANSACTION_SCHEMA,
  SIGNED_TRANSACTION_SCHEMA,
  PENDING_TRANSACTION_ID_SCHEMA,
  BLOCK_TRANSACTION_ID_SCHEMA,
  SIGNED_TRANSACTION_ID_SCHEMA,
  PARTICIPANT_ID_SCHEMA,
  NODE_ID_SCHEMA,
  PAGE_NUMBER_SCHEMA,
  PAGE_SIZE_SCHEMA,
  PUBLIC_KEY_SCHEMA,
  FROM_SCHEMA,
} from "./services/validation-schemas";

// todo - dockerize the server
// todo - unit tests
// todo - mobile app
// todo - register new volunteer, charity and node participant
// todo - add update participant
// todo - add update node
// todo - add a organization resource and a participant-organization association (name, address, email, url, phone number, role, etc.)
// todo - add a license
// todo - add github participant and pull request files
// todo - clean up the input validation (too much repeated code)

export let server: Server;

const buildUnauthorizedError = (detail: string) => {
  let authError = Boom.unauthorized();
  const title = "Unauthorized";
  authError.output.payload.errors = [
    {
      status: authError.output.statusCode,
      title,
      detail,
    },
  ];
  delete authError.output.payload.statusCode;
  delete authError.output.payload.error;
  delete authError.output.payload.message;

  return authError;
};

const buildPointer = (errorItem: ValidationErrorItem): string => {
  let label = "";
  for (const segment of errorItem.path) {
    if (typeof segment === "object") {
      continue;
    }

    if (typeof segment === "string") {
      if (label) {
        label += ".";
      }

      label += segment;
    } else {
      label += `[${segment}]`;
    }
  }

  return label;
};

export const init = async (): Promise<Server> => {
  const sequelizeClient = new SequelizeClient();
  await sequelizeClient.init();

  server = Hapi.server({
    port: PORT,
    host: HOST,
    routes: {
      cors: true,
    },
  });

  server.auth.scheme(
    "custom",
    (): ServerAuthSchemeObject => ({
      authenticate: async (request: Request, h: ResponseToolkit) => {
        const accessTokenWithBearer = request.headers[
          "authorization"
        ] as string;

        const bearerPrefix = "bearer ";

        if (
          accessTokenWithBearer === undefined ||
          accessTokenWithBearer.length < bearerPrefix.length
        ) {
          throw buildUnauthorizedError("Authorization header is required.");
        }

        const accessToken = accessTokenWithBearer.substring(
          bearerPrefix.length
        );

        const serverSecret = getServerSecret();

        try {
          jwt.verify(accessToken, serverSecret);
        } catch (error) {
          console.error(error.message);
          throw buildUnauthorizedError("Unable to verify token.");
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
          throw buildUnauthorizedError("Unable to decode token.");
        }

        if (Math.floor(Date.now() / 1000) > exp) {
          throw buildUnauthorizedError("Token is expired");
        }

        let participant: Participant;
        try {
          participant = await getParticipantById(
            sequelizeClient,
            participantId
          );
        } catch (error) {
          console.error(error.message);
          throw buildUnauthorizedError(
            `Unable to get participant with id: ${participantId}.`
          );
        }

        if (participant === undefined) {
          throw buildUnauthorizedError(
            `Participant with id: ${participantId} was not found.`
          );
        }

        return h.authenticated({ credentials: { participant } });
      },
    })
  );

  server.auth.strategy("custom", "custom");

  server.route({
    method: "GET",
    path: "/",
    handler: () => {
      return {
        links: {
          home: `${PROTOCOL}://${HOST}:${PORT}`,
          blocks: `${PROTOCOL}://${HOST}:${PORT}/blocks`,
          nodes: `${PROTOCOL}://${HOST}:${PORT}/nodes`,
          participants: `${PROTOCOL}://${HOST}:${PORT}/participants`,
          pendingTransactions: `${PROTOCOL}://${HOST}:${PORT}/pending-transactions`,
          self: `${PROTOCOL}://${HOST}:${PORT}`,
        },
        data: {
          description: "I'm a todd-coin node.",
        },
      };
    },
  });

  // Auth

  server.route({
    method: "POST",
    path: "/auth/token",
    handler: async (request: Request, h: ResponseToolkit) => {
      const payload = request.payload as { privateKey: string };

      const { error, value } = AUTH_SCHEMA.validate(payload, {
        abortEarly: false,
      });

      if (error !== undefined) {
        return h
          .response({
            errors: error.details.map((errorItem: ValidationErrorItem) => ({
              status: "400",
              title: "Invalid Attribute",
              source: {
                pointer: buildPointer(errorItem),
              },
              description: errorItem.message,
            })),
          })
          .code(400);
      }

      const validatedPayload = value;

      const { privateKey } = validatedPayload;

      const keyPair: ec.KeyPair = getKeyPairFromPrivateKey(privateKey);
      const publicKey: string = keyPair.getPublic("hex");

      let participant: Participant;
      try {
        participant = await getParticipantByPublicKey(
          sequelizeClient,
          publicKey
        );
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      const serverSecret = getServerSecret();

      try {
        const accessToken = jwt.sign(
          {
            participantId: participant.id,
          },
          serverSecret,
          { expiresIn: "1h" }
        );

        return {
          access: accessToken,
        };
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }
    },
  });

  // Block Management

  server.route({
    method: "GET",
    path: "/blocks",
    options: {
      auth: "custom",
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      const pageNumber: number =
        Number(request.query["page[number]"]) || FIRST_PAGE;

      const pageNumberValidationResult =
        PAGE_NUMBER_SCHEMA.validate(pageNumber);

      if (pageNumberValidationResult.error !== undefined) {
        return h
          .response({
            errors: pageNumberValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Query Parameter",
                description: errorItem.message,
                parameter: "page[number]",
              })
            ),
          })
          .code(400);
      }

      const validatedPageNumber = pageNumberValidationResult.value;

      const pageSize: number =
        Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

      const pageSizeValidationResult = PAGE_SIZE_SCHEMA.validate(pageSize);

      if (pageSizeValidationResult.error !== undefined) {
        return h
          .response({
            errors: pageSizeValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Query Parameter",
                description: errorItem.message,
                parameter: "page[size]",
              })
            ),
          })
          .code(400);
      }

      const validatedPageSize = pageSizeValidationResult.value;

      let response: { count: number; rows: Block[] };
      try {
        response = await getBlocks(
          sequelizeClient,
          validatedPageNumber,
          validatedPageSize
        );
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      const { count, rows } = response;

      return await buildBlocksSerializer(
        count,
        validatedPageNumber,
        validatedPageSize
      ).serialize(rows);
    },
  });

  server.route({
    method: "GET",
    path: "/blocks/{blockId}",
    options: {
      auth: "custom",
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      const { blockId } = request.params;

      const blockIdValidationResult = BLOCK_ID_SCHEMA.validate(blockId);

      if (blockIdValidationResult.error !== undefined) {
        return h
          .response({
            errors: blockIdValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Path Parameter",
                description: errorItem.message,
              })
            ),
          })
          .code(400);
      }

      const validatedBlockId = blockIdValidationResult.value;

      let block: Block;
      try {
        block = await getBlockById(sequelizeClient, validatedBlockId);
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      if (block === undefined) {
        return h
          .response({
            errors: [
              {
                status: "404",
                title: "Not Found",
                detail: `A block with id: ${validatedBlockId} was not found.`,
              },
            ],
          })
          .code(404);
      }

      return await buildBlockSerializer().serialize(block);
    },
  });

  server.route({
    method: "POST",
    path: "/blocks",
    options: {
      auth: "custom",
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      const payload = request.payload as { data: ApiData };

      const { error, value } = BLOCK_SCHEMA.validate(payload, {
        abortEarly: false,
      });

      if (error !== undefined) {
        return h
          .response({
            errors: error.details.map((errorItem: ValidationErrorItem) => ({
              status: "400",
              title: "Invalid Attribute",
              source: {
                pointer: buildPointer(errorItem),
              },
              description: errorItem.message,
            })),
          })
          .code(400);
      }

      const validatedPayload = value;

      const participant = request.auth.credentials.participant as Participant;
      const minerPublicKey = participant.key.public;

      const newBlock = {
        id: validatedPayload.data.id,
        ...validatedPayload.data.attributes,
        transactions: validatedPayload.data.relationships.transactions.map((transactionData: { data: ApiData }) => ({
          id: transactionData.data.id,
          ...transactionData.data.attributes,
        })),
      } as Block;

      let createdBlock: Block;
      try {
        createdBlock = await createBlock(
          sequelizeClient,
          newBlock,
          minerPublicKey
        );
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      // todo - notify known blocks that a new block was added

      return buildBlockSerializer().serialize(createdBlock);
    },
  });

  // Pending Transaction Management

  server.route({
    method: "GET",
    path: "/pending-transactions",
    options: {
      auth: "custom",
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      const pageNumber: number =
        Number(request.query["page[number]"]) || FIRST_PAGE;

      const pageNumberValidationResult =
        PAGE_NUMBER_SCHEMA.validate(pageNumber);

      if (pageNumberValidationResult.error !== undefined) {
        return h
          .response({
            errors: pageNumberValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Query Parameter",
                description: errorItem.message,
                parameter: "page[number]",
              })
            ),
          })
          .code(400);
      }

      const validatedPageNumber = pageNumberValidationResult.value;

      const pageSize: number =
        Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

      const pageSizeValidationResult = PAGE_SIZE_SCHEMA.validate(pageSize);

      if (pageSizeValidationResult.error !== undefined) {
        return h
          .response({
            errors: pageSizeValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Query Parameter",
                description: errorItem.message,
                parameter: "page[size]",
              })
            ),
          })
          .code(400);
      }

      const validatedPageSize = pageSizeValidationResult.value;

      const fromFilter: string = request.query["filter[from]"];

      const fromFilterValidationResult = FROM_SCHEMA.validate(fromFilter);

      if (fromFilterValidationResult.error !== undefined) {
        return h
          .response({
            errors: fromFilterValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Query Parameter",
                description: errorItem.message,
                parameter: "filter[from]",
              })
            ),
          })
          .code(400);
      }

      const validatedFromFilter = fromFilterValidationResult.value;

      const toFilter: string = request.query["filter[to]"];

      const toFilterValidationResult = FROM_SCHEMA.validate(toFilter);

      if (toFilterValidationResult.error !== undefined) {
        return h
          .response({
            errors: toFilterValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Query Parameter",
                description: errorItem.message,
                parameter: "filter[to]",
              })
            ),
          })
          .code(400);
      }

      const validatedToFilter = toFilterValidationResult.value;

      let response: { count: number; rows: Transaction[] };
      try {
        response = await getPendingTransactions(
          sequelizeClient,
          validatedPageNumber,
          validatedPageSize,
          validatedFromFilter,
          validatedToFilter
        );
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      const { count, rows } = response;

      return await buildPendingTransactionsSerializer(
        count,
        validatedPageNumber,
        validatedPageSize
      ).serialize(rows);
    },
  });

  server.route({
    method: "GET",
    path: "/pending-transactions/{pendingTransactionId}",
    options: {
      auth: "custom",
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      const { pendingTransactionId } = request.params;

      const pendingTransactionIdValidationResult =
        PENDING_TRANSACTION_ID_SCHEMA.validate(pendingTransactionId);

      if (pendingTransactionIdValidationResult.error !== undefined) {
        return h
          .response({
            errors: pendingTransactionIdValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Path Parameter",
                description: errorItem.message,
              })
            ),
          })
          .code(400);
      }

      const validatedPendingTransactionId =
        pendingTransactionIdValidationResult.value;

      let pendingTransaction: Transaction;
      try {
        pendingTransaction = await getPendingTransactionById(
          sequelizeClient,
          validatedPendingTransactionId
        );
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      if (pendingTransaction === undefined) {
        return h
          .response({
            errors: [
              {
                status: "404",
                title: "Not Found",
                detail: `A pending transaction with id: ${validatedPendingTransactionId} was not found.`,
              },
            ],
          })
          .code(404);
      }

      return buildPendingTransactionSerializer().serialize(pendingTransaction);
    },
  });

  server.route({
    method: "POST",
    path: "/pending-transactions",
    options: {
      auth: "custom",
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      const payload = request.payload as { data: ApiData };

      const { error, value } = PENDING_TRANSACTION_SCHEMA.validate(payload, {
        abortEarly: false,
      });

      if (error !== undefined) {
        return h
          .response({
            errors: error.details.map((errorItem: ValidationErrorItem) => ({
              status: "400",
              title: "Invalid Attribute",
              source: {
                pointer: buildPointer(errorItem),
              },
              description: errorItem.message,
            })),
          })
          .code(400);
      }

      const validatedPayload = value;

      const newPendingTransaction = {
        id: validatedPayload.data.id,
        ...validatedPayload.data.attributes,
      } as Transaction;

      try {
        const createdPendingTransaction: Transaction =
          await createPendingTransaction(
            sequelizeClient,
            newPendingTransaction
          );

        return buildPendingTransactionSerializer().serialize(
          createdPendingTransaction
        );
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }
    },
  });

  // Signed Transaction Management

  server.route({
    method: "GET",
    path: "/signed-transactions",
    options: {
      auth: "custom",
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      const pageNumber: number =
        Number(request.query["page[number]"]) || FIRST_PAGE;

      const pageNumberValidationResult =
        PAGE_NUMBER_SCHEMA.validate(pageNumber);

      if (pageNumberValidationResult.error !== undefined) {
        return h
          .response({
            errors: pageNumberValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Query Parameter",
                description: errorItem.message,
                parameter: "page[number]",
              })
            ),
          })
          .code(400);
      }

      const validatedPageNumber = pageNumberValidationResult.value;

      const pageSize: number =
        Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

      const pageSizeValidationResult = PAGE_SIZE_SCHEMA.validate(pageSize);

      if (pageSizeValidationResult.error !== undefined) {
        return h
          .response({
            errors: pageSizeValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Query Parameter",
                description: errorItem.message,
                parameter: "page[size]",
              })
            ),
          })
          .code(400);
      }

      const validatedPageSize = pageSizeValidationResult.value;

      let response: { count: number; rows: Transaction[] };
      try {
        response = await getSignedTransactions(
          sequelizeClient,
          validatedPageNumber,
          validatedPageSize
        );
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      const { count, rows } = response;

      return await buildSignedTransactionsSerializer(
        count,
        validatedPageNumber,
        validatedPageSize
      ).serialize(rows);
    },
  });

  server.route({
    method: "GET",
    path: "/signed-transactions/{signedTransactionId}",
    options: {
      auth: "custom",
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      const { signedTransactionId } = request.params;

      const signedTransactionIdValidationResult =
        SIGNED_TRANSACTION_ID_SCHEMA.validate(signedTransactionId);

      if (signedTransactionIdValidationResult.error !== undefined) {
        return h
          .response({
            errors: signedTransactionIdValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Path Parameter",
                description: errorItem.message,
              })
            ),
          })
          .code(400);
      }

      const validatedSignedTransactionId =
        signedTransactionIdValidationResult.value;

      let signedTransaction: Transaction;
      try {
        signedTransaction = await getSignedTransactionById(
          sequelizeClient,
          validatedSignedTransactionId
        );
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      if (signedTransaction === undefined) {
        return h
          .response({
            errors: [
              {
                status: "404",
                title: "Not Found",
                detail: `A signed transaction with id: ${validatedSignedTransactionId} was not found.`,
              },
            ],
          })
          .code(404);
      }

      return buildSignedTransactionSerializer().serialize(signedTransaction);
    },
  });

  server.route({
    method: "POST",
    path: "/signed-transactions",
    options: {
      auth: "custom",
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      const payload = request.payload as { data: ApiData };

      const { error, value } = SIGNED_TRANSACTION_SCHEMA.validate(payload, {
        abortEarly: false,
      });

      if (error !== undefined) {
        return h
          .response({
            errors: error.details.map((errorItem: ValidationErrorItem) => ({
              status: "400",
              title: "Invalid Attribute",
              source: {
                pointer: buildPointer(errorItem),
              },
              description: errorItem.message,
            })),
          })
          .code(400);
      }

      const validatedPayload = value;

      const newSignedTransaction = {
        id: validatedPayload.data.id,
        ...validatedPayload.data.attributes,
      } as Transaction;

      let createdSignedTransaction: Transaction;
      try {
        createdSignedTransaction = await createSignedTransaction(
          sequelizeClient,
          newSignedTransaction
        );
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      // todo - when the number of signed transactions reaches a threshold, automatically mine a new block

      return buildSignedTransactionSerializer().serialize(
        createdSignedTransaction
      );
    },
  });

  // Block Transaction Management

  server.route({
    method: "GET",
    path: "/blocks/{blockId}/transactions",
    options: {
      auth: "custom",
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      const { blockId } = request.params;
      const pageNumber: number =
        Number(request.query["page[number]"]) || FIRST_PAGE;

      const pageNumberValidationResult =
        PAGE_NUMBER_SCHEMA.validate(pageNumber);

      if (pageNumberValidationResult.error !== undefined) {
        return h
          .response({
            errors: pageNumberValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Query Parameter",
                description: errorItem.message,
                parameter: "page[number]",
              })
            ),
          })
          .code(400);
      }

      const validatedPageNumber = pageNumberValidationResult.value;

      const pageSize: number =
        Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

      const pageSizeValidationResult = PAGE_SIZE_SCHEMA.validate(pageSize);

      if (pageSizeValidationResult.error !== undefined) {
        return h
          .response({
            errors: pageSizeValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Query Parameter",
                description: errorItem.message,
                parameter: "page[size]",
              })
            ),
          })
          .code(400);
      }

      const validatedPageSize = pageSizeValidationResult.value;

      const blockIdValidationResult = BLOCK_ID_SCHEMA.validate(blockId);

      if (blockIdValidationResult.error !== undefined) {
        return h
          .response({
            errors: blockIdValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Path Parameter",
                description: errorItem.message,
              })
            ),
          })
          .code(400);
      }

      const validatedBlockId = blockIdValidationResult.value;

      let block: Block;
      try {
        block = await getBlockById(sequelizeClient, validatedBlockId);
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      if (block === undefined) {
        return h
          .response({
            errors: [
              {
                status: "404",
                title: "Not Found",
                detail: `A block with id: ${validatedBlockId} was not found.`,
              },
            ],
          })
          .code(404);
      }

      let response: { count: number; rows: Transaction[] };
      try {
        response = await getBlockTransactions(
          sequelizeClient,
          validatedPageNumber,
          validatedPageSize,
          blockId
        );
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      const { count, rows } = response;

      return await buildBlockTransactionsSerializer(
        block,
        count,
        validatedPageNumber,
        validatedPageSize
      ).serialize(rows);
    },
  });

  server.route({
    method: "GET",
    path: "/blocks/{blockId}/transactions/{blockTransactionId}",
    options: {
      auth: "custom",
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      const { blockId, blockTransactionId } = request.params;

      const blockIdValidationResult = BLOCK_ID_SCHEMA.validate(blockId);

      if (blockIdValidationResult.error !== undefined) {
        return h
          .response({
            errors: blockIdValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Path Parameter",
                description: errorItem.message,
              })
            ),
          })
          .code(400);
      }

      const validatedBlockId = blockIdValidationResult.value;

      const blockTransactionIdValidationResult =
        BLOCK_TRANSACTION_ID_SCHEMA.validate(blockTransactionId);

      if (blockTransactionIdValidationResult.error !== undefined) {
        return h
          .response({
            errors: blockTransactionIdValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Path Parameter",
                description: errorItem.message,
              })
            ),
          })
          .code(400);
      }

      const validatedBlockTransactionId =
        blockTransactionIdValidationResult.value;

      let block: Block;
      try {
        block = await getBlockById(sequelizeClient, validatedBlockId);
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      if (block === undefined) {
        return h
          .response({
            errors: [
              {
                status: "404",
                title: "Not Found",
                detail: `A block with id: ${validatedBlockId} was not found.`,
              },
            ],
          })
          .code(404);
      }

      let blockTransaction: Transaction;
      try {
        blockTransaction = await getBlockTransactionById(
          sequelizeClient,
          validatedBlockId,
          validatedBlockTransactionId
        );
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      if (blockTransaction === undefined) {
        return h
          .response({
            errors: [
              {
                status: "404",
                title: "Not Found",
                detail: `A block transaction with id: ${validatedBlockTransactionId} was not found.`,
              },
            ],
          })
          .code(404);
      }

      return buildBlockTransactionSerializer(block).serialize(blockTransaction);
    },
  });

  // Participant Management

  server.route({
    method: "GET",
    path: "/participants",
    options: {
      auth: "custom",
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      const pageNumber: number =
        Number(request.query["page[number]"]) || FIRST_PAGE;

      const pageNumberValidationResult =
        PAGE_NUMBER_SCHEMA.validate(pageNumber);

      if (pageNumberValidationResult.error !== undefined) {
        return h
          .response({
            errors: pageNumberValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Query Parameter",
                description: errorItem.message,
                parameter: "page[number]",
              })
            ),
          })
          .code(400);
      }

      const validatedPageNumber = pageNumberValidationResult.value;

      const pageSize: number =
        Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

      const pageSizeValidationResult = PAGE_SIZE_SCHEMA.validate(pageSize);

      if (pageSizeValidationResult.error !== undefined) {
        return h
          .response({
            errors: pageSizeValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Query Parameter",
                description: errorItem.message,
                parameter: "page[size]",
              })
            ),
          })
          .code(400);
      }

      const validatedPageSize = pageSizeValidationResult.value;

      const publicKeyFilter: string = request.query["filter[publicKey]"];

      const publicKeyFilterValidationResult =
        PUBLIC_KEY_SCHEMA.validate(publicKeyFilter);

      if (publicKeyFilterValidationResult.error !== undefined) {
        return h
          .response({
            errors: publicKeyFilterValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Query Parameter",
                description: errorItem.message,
                parameter: "filter[publicKey]",
              })
            ),
          })
          .code(400);
      }

      const validatedPublicKeyFilter = publicKeyFilterValidationResult.value;

      let response: { count: number; rows: Participant[] };
      try {
        response = await getParticipants(
          sequelizeClient,
          validatedPageNumber,
          validatedPageSize,
          validatedPublicKeyFilter
        );
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      const { count, rows } = response;

      return buildParticipantsSerializer(
        count,
        validatedPageNumber,
        validatedPageSize
      ).serialize(rows);
    },
  });

  server.route({
    method: "GET",
    path: "/participants/{participantId}",
    options: {
      auth: "custom",
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      const { participantId } = request.params;

      const participantIdValidationResult =
        PARTICIPANT_ID_SCHEMA.validate(participantId);

      if (participantIdValidationResult.error !== undefined) {
        return h
          .response({
            errors: participantIdValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Path Parameter",
                description: errorItem.message,
              })
            ),
          })
          .code(400);
      }

      const validatedParticipantId = participantIdValidationResult.value;

      let participant: Participant;
      try {
        participant = await getParticipantById(
          sequelizeClient,
          validatedParticipantId
        );
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      if (participant === undefined) {
        return h
          .response({
            errors: [
              {
                status: "404",
                title: "Not Found",
                detail: `A participant with id: ${validatedParticipantId} was not found.`,
              },
            ],
          })
          .code(404);
      }

      return buildParticipantSerializer().serialize(participant);
    },
  });

  server.route({
    method: "POST",
    path: "/participants",
    options: {
      auth: "custom",
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      const payload = request.payload as { data: ApiData };

      // todo - check for dupe participants

      const { error, value } = PARTICIPANT_SCHEMA.validate(payload, {
        abortEarly: false,
      });

      const validatedPayload = value;

      if (error !== undefined) {
        return h
          .response({
            errors: error.details.map((errorItem: ValidationErrorItem) => ({
              status: "400",
              title: "Invalid Attribute",
              source: {
                pointer: buildPointer(errorItem),
              },
              description: errorItem.message,
            })),
          })
          .code(400);
      }

      const participantKey = generateParticipantKey();

      const newParticipant = {
        id: validatedPayload.data.id,
        ...validatedPayload.data.attributes,
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
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      // todo - notify known participants that a new participant was added

      return buildParticipantSerializer().serialize({
        ...createdParticipant,
        key: {
          public: createdParticipant.key.public,
          private: participantKey.private,
        },
      });
    },
  });

  // Node Management

  server.route({
    method: "GET",
    path: "/nodes",
    options: {
      auth: "custom",
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      const pageNumber: number =
        Number(request.query["page[number]"]) || FIRST_PAGE;

      const pageNumberValidationResult =
        PAGE_NUMBER_SCHEMA.validate(pageNumber);

      if (pageNumberValidationResult.error !== undefined) {
        return h
          .response({
            errors: pageNumberValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Query Parameter",
                description: errorItem.message,
                parameter: "page[number]",
              })
            ),
          })
          .code(400);
      }

      const validatedPageNumber = pageNumberValidationResult.value;

      const pageSize: number =
        Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

      const pageSizeValidationResult = PAGE_SIZE_SCHEMA.validate(pageSize);

      if (pageSizeValidationResult.error !== undefined) {
        return h
          .response({
            errors: pageSizeValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Query Parameter",
                description: errorItem.message,
                parameter: "page[size]",
              })
            ),
          })
          .code(400);
      }

      const validatedPageSize = pageSizeValidationResult.value;

      let response: { count: number; rows: Node[] };
      try {
        response = await getNodes(
          sequelizeClient,
          validatedPageNumber,
          validatedPageSize
        );
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      const { count, rows } = response;

      return buildNodesSerializer(
        count,
        validatedPageNumber,
        validatedPageSize
      ).serialize(rows);
    },
  });

  server.route({
    method: "GET",
    path: "/nodes/{nodeId}",
    options: {
      auth: "custom",
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      const { nodeId } = request.params;

      const nodeIdValidationResult = NODE_ID_SCHEMA.validate(nodeId);

      if (nodeIdValidationResult.error !== undefined) {
        return h
          .response({
            errors: nodeIdValidationResult.error.details.map(
              (errorItem: ValidationErrorItem) => ({
                status: "400",
                title: "Invalid Path Parameter",
                description: errorItem.message,
              })
            ),
          })
          .code(400);
      }

      const validatedNodeId = nodeIdValidationResult.value;

      let node: Node;
      try {
        node = await getNodeById(sequelizeClient, validatedNodeId);
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      if (node === undefined) {
        return h
          .response({
            errors: [
              {
                status: "404",
                title: "Not Found",
                detail: `A node with id: ${validatedNodeId} was not found.`,
              },
            ],
          })
          .code(404);
      }

      return buildNodeSerializer().serialize(node);
    },
  });

  server.route({
    method: "POST",
    path: "/nodes",
    options: {
      auth: "custom",
    },
    handler: async (request: Request, h: ResponseToolkit) => {
      const payload = request.payload as { data: ApiData };

      // todo - check for dupe nodes

      const { error, value } = NODE_SCHEMA.validate(payload, {
        abortEarly: false,
      });

      if (error !== undefined) {
        return h
          .response({
            errors: error.details.map((errorItem: ValidationErrorItem) => ({
              status: "400",
              title: "Invalid Attribute",
              source: {
                pointer: buildPointer(errorItem),
              },
              description: errorItem.message,
            })),
          })
          .code(400);
      }

      const validatedPayload = value;

      // todo - once validated, sync up with the new node

      const newNode: Node = {
        id: validatedPayload.data.id,
        ...validatedPayload.data.attributes,
      } as Node;

      let createdNode: Node;
      try {
        createdNode = await createNode(sequelizeClient, newNode);
      } catch (error) {
        console.error(error.message);
        return h
          .response({
            errors: [
              {
                status: "500",
                title: "Internal Server Error",
              },
            ],
          })
          .code(500);
      }

      // todo - notify known nodes that a new node was added

      return buildNodeSerializer().serialize(createdNode);
    },
  });

  return server;
};

export const start = async (): Promise<void> => {
  console.log(`Listening on ${server.settings.host}:${server.settings.port}`);
  return server.start();
};

process.on("unhandledRejection", (err) => {
  console.error("unhandledRejection");
  console.error(err);
  process.exit(1);
});
