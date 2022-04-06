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

// todo - dockerize the server
// todo - unit tests
// todo - mobile app
// todo - register new volunteer, charity and node participant
// todo - add update participant
// todo - add update node
// todo - add a organization resource and a participant-organization association (name, address, email, url, phone number, role, etc.)
// todo - add a license
// todo - add github participant and pull request files

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
      const { privateKey } = payload;

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
      const pageSize: number =
        Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

      // todo - validate the input

      let response: { count: number; rows: Block[] };
      try {
        response = await getBlocks(sequelizeClient, pageNumber, pageSize);
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

      return await buildBlocksSerializer(count, pageNumber, pageSize).serialize(
        rows
      );
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

      let block: Block;
      try {
        block = await getBlockById(sequelizeClient, blockId);
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
                detail: `A block with id: ${blockId} was not found.`,
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

      // todo - validate the block
      // todo - enforce the maximum number of transactions per block

      const participant = request.auth.credentials.participant as Participant;
      const minerPublicKey = participant.key.public;

      const newBlock = {
        id: payload.data.id,
        ...payload.data.attributes,
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
      const pageSize: number =
        Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;
      const filterFrom: string = request.query["filter[from]"];
      const filterTo: string = request.query["filter[to]"];

      // todo - validate the input

      let response: { count: number; rows: Transaction[] };
      try {
        response = await getPendingTransactions(
          sequelizeClient,
          pageNumber,
          pageSize,
          filterFrom,
          filterTo
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
        pageNumber,
        pageSize
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

      let pendingTransaction: Transaction;
      try {
        pendingTransaction = await getPendingTransactionById(
          sequelizeClient,
          pendingTransactionId
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
                detail: `A pending transaction with id: ${pendingTransactionId} was not found.`,
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

      // todo - validate the pending transaction

      const newPendingTransaction = {
        id: payload.data.id,
        ...payload.data.attributes,
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
      const pageSize: number =
        Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

      // todo - validate the input

      let response: { count: number; rows: Transaction[] };
      try {
        response = await getSignedTransactions(
          sequelizeClient,
          pageNumber,
          pageSize
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
        pageNumber,
        pageSize
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

      let signedTransaction: Transaction;
      try {
        signedTransaction = await getSignedTransactionById(
          sequelizeClient,
          signedTransactionId
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
                detail: `A signed transaction with id: ${signedTransactionId} was not found.`,
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

      // todo - validate the signed transaction

      const newSignedTransaction = {
        id: payload.data.id,
        ...payload.data.attributes,
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
      const pageSize: number =
        Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

      // todo - validate the input

      let block: Block;
      try {
        block = await getBlockById(sequelizeClient, blockId);
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
                detail: `A block with id: ${blockId} was not found.`,
              },
            ],
          })
          .code(404);
      }

      let response: { count: number; rows: Transaction[] };
      try {
        response = await getBlockTransactions(
          sequelizeClient,
          pageNumber,
          pageSize,
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
        pageNumber,
        pageSize
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

      let block: Block;
      try {
        block = await getBlockById(sequelizeClient, blockId);
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
                detail: `A block with id: ${blockId} was not found.`,
              },
            ],
          })
          .code(404);
      }

      let blockTransaction: Transaction;
      try {
        blockTransaction = await getBlockTransactionById(
          sequelizeClient,
          blockId,
          blockTransactionId
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
                detail: `A block transaction with id: ${blockTransactionId} was not found.`,
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
      const pageSize: number =
        Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;
      const filterPublicKey: string = request.query["filter[publicKey]"];

      // todo - validate the input

      let response: { count: number; rows: Participant[] };
      try {
        response = await getParticipants(
          sequelizeClient,
          pageNumber,
          pageSize,
          filterPublicKey
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

      return buildParticipantsSerializer(count, pageNumber, pageSize).serialize(
        rows
      );
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

      let participant: Participant;
      try {
        participant = await getParticipantById(sequelizeClient, participantId);
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
                detail: `A participant with id: ${participantId} was not found.`,
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

      // todo - validate the new participant

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
      const pageSize: number =
        Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

      // todo - validate the input

      let response: { count: number; rows: Node[] };
      try {
        response = await getNodes(sequelizeClient, pageNumber, pageSize);
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

      return buildNodesSerializer(count, pageNumber, pageSize).serialize(rows);
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

      let node: Node;
      try {
        node = await getNodeById(sequelizeClient, nodeId);
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
                detail: `A node with id: ${nodeId} was not found.`,
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

      // todo - validate the new node

      // todo - once validated, sync up with the new node

      const newNode: Node = {
        id: payload.data.id,
        ...payload.data.attributes,
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
