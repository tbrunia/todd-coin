"use strict";

import { ApiData, Block, Node, Participant, Transaction } from "./types";
import * as Hapi from "@hapi/hapi";
import { Request, ResponseToolkit, Server } from "@hapi/hapi";
import * as Boom from "@hapi/boom";
import {
  DEFAULT_PAGE_SIZE,
  FIRST_PAGE,
  HOST,
  PORT,
  PROTOCOL,
} from "./constants";
import { generateParticipantKey } from "./services/key-utils";
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
  getParticipants,
} from "./brokers/paticipants-broker";
import { createNode, getNodeById, getNodes } from "./brokers/nodes-broker";

// todo - dockerize the server
// todo - authentication and authorization?
// todo - unit tests
// todo - mobile app

export let server: Server;

export const init = async (): Promise<Server> => {
  const sequelizeClient = new SequelizeClient();
  await sequelizeClient.init();

  server = Hapi.server({
    port: PORT,
    host: HOST,
  });

  server.route({
    method: "GET",
    path: "/",
    handler: (request, h) => {
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

  // Block Management

  server.route({
    method: "GET",
    path: "/blocks",
    handler: async (request, h) => {
      const pageNumber: number =
        Number(request.query["page[number]"]) || FIRST_PAGE;
      const pageSize: number =
        Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

      // todo - validate the input

      const { count, rows } = await getBlocks(
        sequelizeClient,
        pageNumber,
        pageSize
      );

      return await buildBlocksSerializer(count, pageNumber, pageSize).serialize(
        rows
      );
    },
  });

  server.route({
    method: "GET",
    path: "/blocks/{blockId}",
    handler: async (request, h) => {
      const { blockId } = request.params;

      const block = await getBlockById(sequelizeClient, blockId);

      if (!block) {
        throw Boom.notFound();
      }

      return await buildBlockSerializer().serialize(block);
    },
  });

  server.route({
    method: "POST",
    path: "/blocks",
    handler: async (request, h) => {
      const payload = request.payload as { data: ApiData };

      // todo - validate the block
      // todo - enforce the maximum number of transactions per block

      const minerPublicKey = request.headers["x-miner-public-key"] as string;

      // todo validate the minerPublicKey

      const newBlock = {
        id: payload.data.id,
        ...payload.data.attributes,
      } as Block;

      try {
        const createdBlock = await createBlock(
          sequelizeClient,
          newBlock,
          minerPublicKey
        );

        // todo - notify known blocks that a new block was added

        return buildBlockSerializer().serialize(createdBlock);
      } catch (error) {
        console.log(error.message);
        throw Boom.internal();
      }
    },
  });

  // Pending Transaction Management

  server.route({
    method: "GET",
    path: "/pending-transactions",
    handler: async (request, h) => {
      const pageNumber: number =
        Number(request.query["page[number]"]) || FIRST_PAGE;
      const pageSize: number =
        Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

      // todo - validate the input

      const { count, rows } = await getPendingTransactions(
        sequelizeClient,
        pageNumber,
        pageSize
      );

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
    handler: async (request, h) => {
      const { pendingTransactionId } = request.params;

      const pendingTransaction: Transaction = await getPendingTransactionById(
        sequelizeClient,
        pendingTransactionId
      );

      if (!pendingTransaction) {
        throw Boom.notFound();
      }

      return buildPendingTransactionSerializer().serialize(pendingTransaction);
    },
  });

  server.route({
    method: "POST",
    path: "/pending-transactions",
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
        console.log(error.message);
        throw Boom.internal();
      }
    },
  });

  // Signed Transaction Management

  server.route({
    method: "GET",
    path: "/signed-transactions",
    handler: async (request, h) => {
      const pageNumber: number =
        Number(request.query["page[number]"]) || FIRST_PAGE;
      const pageSize: number =
        Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

      // todo - validate the input

      const { count, rows } = await getSignedTransactions(
        sequelizeClient,
        pageNumber,
        pageSize
      );

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
    handler: async (request, h) => {
      const { signedTransactionId } = request.params;

      const signedTransaction: Transaction = await getSignedTransactionById(
        sequelizeClient,
        signedTransactionId
      );

      if (!signedTransaction) {
        throw Boom.notFound();
      }

      return buildSignedTransactionSerializer().serialize(signedTransaction);
    },
  });

  server.route({
    method: "POST",
    path: "/signed-transactions",
    handler: async (request: Request, h: ResponseToolkit) => {
      const payload = request.payload as { data: ApiData };

      // todo - validate the signed transaction

      const newSignedTransaction = {
        id: payload.data.id,
        ...payload.data.attributes,
      } as Transaction;

      try {
        const createdSignedTransaction: Transaction =
          await createSignedTransaction(sequelizeClient, newSignedTransaction);

        return buildSignedTransactionSerializer().serialize(
          createdSignedTransaction
        );
      } catch (error) {
        console.log(error.message);
        throw Boom.internal();
      }
    },
  });

  // Block Transaction Management

  server.route({
    method: "GET",
    path: "/blocks/{blockId}/transactions",
    handler: async (request, h) => {
      const { blockId } = request.params;
      const pageNumber: number =
        Number(request.query["page[number]"]) || FIRST_PAGE;
      const pageSize: number =
        Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

      // todo - validate the input

      const block: Block = await getBlockById(sequelizeClient, blockId);

      const { count, rows } = await getBlockTransactions(
        sequelizeClient,
        blockId,
        pageNumber,
        pageSize
      );

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
    path: "/blocks/{blockId}/transactions/{transactionId}",
    handler: async (request, h) => {
      const { blockId, transactionId } = request.params;

      const block: Block = await getBlockById(sequelizeClient, blockId);
      const blockTransaction: Transaction = await getBlockTransactionById(
        sequelizeClient,
        blockId,
        transactionId
      );

      return buildBlockTransactionSerializer(block).serialize(blockTransaction);
    },
  });

  // Participant Management

  server.route({
    method: "GET",
    path: "/participants",
    handler: async (request, h) => {
      const pageNumber: number =
        Number(request.query["page[number]"]) || FIRST_PAGE;
      const pageSize: number =
        Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

      // todo - validate the input

      const { count, rows } = await getParticipants(
        sequelizeClient,
        pageNumber,
        pageSize
      );

      return buildParticipantsSerializer(count, pageNumber, pageSize).serialize(
        rows
      );
    },
  });

  server.route({
    method: "GET",
    path: "/participants/{participantId}",
    handler: async (request, h) => {
      const { participantId } = request.params;

      const participant: Participant = await getParticipantById(
        sequelizeClient,
        participantId
      );

      return buildParticipantSerializer().serialize(participant);
    },
  });

  server.route({
    method: "POST",
    path: "/participants",
    handler: async (request: Request, h: ResponseToolkit) => {
      const payload = request.payload as { data: ApiData };

      // todo - validate the new participant

      const participantKey = generateParticipantKey();

      const newParticipant = {
        id: payload.data.id,
        ...payload.data.attributes,
        key: { public: participantKey.public },
      };

      try {
        const createdParticipant: Participant = await createParticipant(
          sequelizeClient,
          newParticipant
        );

        // todo - notify known participants that a new participant was added

        return buildParticipantSerializer().serialize({
          ...createdParticipant,
          key: {
            public: createdParticipant.key.public,
            private: participantKey.private,
          },
        });
      } catch (error) {
        console.log(error.message);
        throw Boom.internal();
      }
    },
  });

  // Node Management

  server.route({
    method: "GET",
    path: "/nodes",
    handler: async (request, h) => {
      const pageNumber: number =
        Number(request.query["page[number]"]) || FIRST_PAGE;
      const pageSize: number =
        Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

      // todo - validate the input

      const { count, rows } = await getNodes(
        sequelizeClient,
        pageNumber,
        pageSize
      );

      return buildNodesSerializer(count, pageNumber, pageSize).serialize(rows);
    },
  });

  server.route({
    method: "GET",
    path: "/nodes/{nodeId}",
    handler: async (request, h) => {
      const { nodeId } = request.params;

      const node: Node = await getNodeById(sequelizeClient, nodeId);

      return buildNodeSerializer().serialize(node);
    },
  });

  server.route({
    method: "POST",
    path: "/nodes",
    handler: async (request: Request, h: ResponseToolkit) => {
      const payload = request.payload as { data: ApiData };

      // todo - validate the new node

      // todo - once validated, sync up with the new node

      const newNode: Node = {
        id: payload.data.id,
        ...payload.data.attributes,
      } as Node;

      try {
        const createdNode: Node = await createNode(sequelizeClient, newNode);

        // todo - notify known nodes that a new node was added

        return buildNodeSerializer().serialize(createdNode);
      } catch (error) {
        console.log(error.message);
        throw Boom.internal();
      }
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
