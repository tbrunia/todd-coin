import { readFileSync } from "fs";
import { Block, Participant, Transaction } from "./types";

const Hapi = require("@hapi/hapi");
const Boom = require("@hapi/boom");

const PROTOCOL = "http";
const PORT = 3000;
const DOMAIN = "localhost";

const init = async () => {
  const server = Hapi.server({
    port: PORT,
    host: DOMAIN,
  });

  server.route({
    method: "GET",
    path: "/",
    handler: (request, h) => {
      return {
        links: {
          home: `${PROTOCOL}://${DOMAIN}:${PORT}`,
          blocks: `${PROTOCOL}://${DOMAIN}:${PORT}/blocks`,
          participants: `${PROTOCOL}://${DOMAIN}:${PORT}/participants`,
          pendingTransactions: `${PROTOCOL}://${DOMAIN}:${PORT}/pending-transactions`,
          self: `${PROTOCOL}://${DOMAIN}:${PORT}`,
        },
        data: {
          description: "I'm a todd-coin node.",
        },
      };
    },
  });

  server.route({
    method: "GET",
    path: "/blocks",
    handler: (request, h) => {
      const toddCoin = JSON.parse(readFileSync("todd-coin.json").toString());
      const { chain } = toddCoin;
      return {
        links: {
          home: `${PROTOCOL}://${DOMAIN}:${PORT}`,
          self: `${PROTOCOL}://${DOMAIN}:${PORT}/blocks`,
        },
        data: chain,
      };
    },
  });

  server.route({
    method: "GET",
    path: "/blocks/{blockId}",
    handler: (request, h) => {
      const { blockId } = request.params;
      const toddCoin = JSON.parse(readFileSync("todd-coin.json").toString());
      const { chain } = toddCoin;
      const block = chain.find((block: Block) => block.id === blockId);

      if (!block) {
        throw Boom.notFound();
      }

      return {
        links: {
          home: `${PROTOCOL}://${DOMAIN}:${PORT}`,
          self: `${PROTOCOL}://${DOMAIN}:${PORT}/blocks/${blockId}`,
        },
        data: block,
      };
    },
  });

  server.route({
    method: "GET",
    path: "/blocks/{blockId}/transactions",
    handler: (request, h) => {
      const { blockId } = request.params;
      const toddCoin = JSON.parse(readFileSync("todd-coin.json").toString());
      const { chain } = toddCoin;
      const block = chain.find((block: Block) => block.id === blockId);

      if (!block) {
        throw Boom.notFound();
      }

      const { transactions } = block;
      return {
        links: {
          home: `${PROTOCOL}://${DOMAIN}:${PORT}`,
          self: `${PROTOCOL}://${DOMAIN}:${PORT}/blocks/${blockId}/transactions`,
        },
        data: transactions,
      };
    },
  });

  server.route({
    method: "GET",
    path: "/blocks/{blockId}/transactions/{transactionId}",
    handler: (request, h) => {
      const { blockId, transactionId } = request.params;
      const toddCoin = JSON.parse(readFileSync("todd-coin.json").toString());
      const { chain } = toddCoin;
      const block = chain.find((block: Block) => block.id === blockId);

      if (!block) {
        throw Boom.notFound();
      }

      const { transactions } = block;
      const transaction = transactions.find(
        (transaction: Transaction) => transaction.id === transactionId
      );

      if (!transaction) {
        throw Boom.notFound();
      }

      return {
        links: {
          home: `${PROTOCOL}://${DOMAIN}:${PORT}`,
          self: `${PROTOCOL}://${DOMAIN}:${PORT}/blocks/${blockId}/transactions/${transactionId}`,
        },
        data: transaction,
      };
    },
  });

  server.route({
    method: "GET",
    path: "/pending-transactions",
    handler: (request, h) => {
      const toddCoin = JSON.parse(readFileSync("todd-coin.json").toString());
      const { pendingTransactions } = toddCoin;
      return {
        links: {
          home: `${PROTOCOL}://${DOMAIN}:${PORT}`,
          self: `${PROTOCOL}://${DOMAIN}:${PORT}/pending-transactions`,
        },
        data: pendingTransactions,
      };
    },
  });

  server.route({
    method: "GET",
    path: "/participants",
    handler: (request, h) => {
      const toddCoin = JSON.parse(readFileSync("todd-coin.json").toString());
      const { participants } = toddCoin;
      return {
        links: {
          home: `${PROTOCOL}://${DOMAIN}:${PORT}`,
          self: `${PROTOCOL}://${DOMAIN}:${PORT}/participants`,
        },
        data: participants,
      };
    },
  });

  server.route({
    method: "GET",
    path: "/participants/{participantId}",
    handler: (request, h) => {
      const { participantId } = request.params;
      const toddCoin = JSON.parse(readFileSync("todd-coin.json").toString());
      const { participants } = toddCoin;
      const participant = participants.find(
        (participant: Participant) => participant.id === participantId
      );

      if (!participant) {
        throw Boom.notFound();
      }

      return {
        links: {
          home: `${PROTOCOL}://${DOMAIN}:${PORT}`,
          self: `${PROTOCOL}://${DOMAIN}:${PORT}/participants/${participantId}`,
        },
        data: participant,
      };
    },
  });

  await server.start();
  console.log("todd-coin node running on %s", server.info.uri);
};

process.on("unhandledRejection", (err) => {
  console.log(err);
  process.exit(1);
});

init().then();
