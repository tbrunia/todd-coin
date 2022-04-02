"use strict";

import { Block, Node, Participant, Transaction } from "./types";
import * as Hapi from "@hapi/hapi";
import { Request, ResponseToolkit, Server } from "@hapi/hapi";
import * as Boom from "@hapi/boom";
import { v4 } from "uuid";
import { Linker, Paginator, Relator, Serializer } from "ts-japi";
import _ from "lodash";
import { MINING_REWARD } from "./constants";
import { generateParticipantKey } from "./services/key-generator";
import { DataTypes, Sequelize } from "sequelize";
import { createGenesisBlock } from "./services/blockchain-service";

const PROTOCOL = "http";
const PORT = 3000;
const HOST = "localhost";

// todo - authentication and authorization?
// todo - dockerize the server
// todo - unit tests
// todo - mobile app

export let server: Server;

const buildBlockSerializer = (): Serializer<Block> => {
  return new Serializer<Block>("block", {
    nullData: false,
    projection: {
      transactions: 0,
    },
    relators: [
      new Relator<Block, Transaction>(
        async (block: Block) => block.transactions,
        new Serializer<Transaction>("transactions", {
          onlyIdentifier: true,
        }),
        {
          linkers: {
            related: new Linker<[Block]>((block: Block) => {
              return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions?page[number]=0&page[size]=10`;
            }),
          },
        }
      ),
    ],
    linkers: {
      document: new Linker((block: Block) => {
        return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}`;
      }),
      resource: new Linker((block: Block) => {
        return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}`;
      }),
    },
  });
};

const buildBlocksSerializer = (
  firstPage: number,
  lastPage: number,
  currentPage: number,
  pageSize: number
): Serializer<Block> => {
  return new Serializer<Block>("block", {
    nullData: false,
    projection: {
      transactions: 0,
    },
    relators: [
      new Relator<Block, Transaction>(
        async (block: Block) => _.first(_.chunk(block.transactions, 10)),
        new Serializer<Transaction>("transactions", {
          onlyIdentifier: true,
        }),
        {
          linkers: {
            related: new Linker<[Block]>((block: Block) => {
              return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions?page[number]=0&page[size]=10`;
            }),
          },
        }
      ),
    ],
    linkers: {
      document: new Linker(() => {
        return `${PROTOCOL}://${HOST}:${PORT}/blocks?page[number]=${currentPage}&page[size]=${pageSize}`;
      }),
      resource: new Linker((block: Block) => {
        return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}`;
      }),
      paginator: new Paginator(() => {
        const nextPage = currentPage + 1;
        const previousPage = currentPage - 1;
        return {
          first: `${PROTOCOL}://${HOST}:${PORT}/blocks?page[number]=${firstPage}&page[size]=${pageSize}`,
          last: `${PROTOCOL}://${HOST}:${PORT}/blocks?page[number]=${lastPage}&page[size]=${pageSize}`,
          next:
            nextPage <= lastPage
              ? `${PROTOCOL}://${HOST}:${PORT}/blocks?page[number]=${nextPage}&page[size]=${pageSize}`
              : null,
          prev:
            previousPage >= 0
              ? `${PROTOCOL}://${HOST}:${PORT}/blocks?page[number]=${previousPage}&page[size]=${pageSize}`
              : null,
        };
      }),
    },
  });
};

const buildPendingTransactionSerializer = (): Serializer<Transaction> => {
  return new Serializer<Transaction>("pending-transaction", {
    nullData: false,
    linkers: {
      document: new Linker((pendingTransactions: Transaction) => {
        return `${PROTOCOL}://${HOST}:${PORT}/pending-transactions/${pendingTransactions.id}`;
      }),
      resource: new Linker((pendingTransaction: Transaction) => {
        return `${PROTOCOL}://${HOST}:${PORT}/pending-transactions/${pendingTransaction.id}`;
      }),
    },
  });
};

const buildPendingTransactionsSerializer = (
  firstPage: number,
  lastPage: number,
  currentPage: number,
  pageSize: number
): Serializer<Transaction> => {
  return new Serializer<Transaction>("pending-transaction", {
    nullData: false,
    linkers: {
      document: new Linker(() => {
        return `${PROTOCOL}://${HOST}:${PORT}/pending-transactions?page[number]=${currentPage}&page[size]=${pageSize}`;
      }),
      resource: new Linker((pendingTransaction: Transaction) => {
        return `${PROTOCOL}://${HOST}:${PORT}/pending-transactions/${pendingTransaction.id}`;
      }),
      paginator: new Paginator(() => {
        const nextPage = currentPage + 1;
        const previousPage = currentPage - 1;
        return {
          first: `${PROTOCOL}://${HOST}:${PORT}/pending-transactions?page[number]=${firstPage}&page[size]=${pageSize}`,
          last: `${PROTOCOL}://${HOST}:${PORT}/pending-transactions?page[number]=${lastPage}&page[size]=${pageSize}`,
          next:
            nextPage <= lastPage
              ? `${PROTOCOL}://${HOST}:${PORT}/pending-transactions?page[number]=${nextPage}&page[size]=${pageSize}`
              : null,
          prev:
            previousPage >= 0
              ? `${PROTOCOL}://${HOST}:${PORT}/pending-transactions?page[number]=${previousPage}&page[size]=${pageSize}`
              : null,
        };
      }),
    },
  });
};

const buildSignedTransactionSerializer = (): Serializer<Transaction> => {
  return new Serializer<Transaction>("signed-transaction", {
    nullData: false,
    linkers: {
      document: new Linker((signedTransactions: Transaction) => {
        return `${PROTOCOL}://${HOST}:${PORT}/signed-transactions/${signedTransactions.id}`;
      }),
      resource: new Linker((signedTransaction: Transaction) => {
        return `${PROTOCOL}://${HOST}:${PORT}/signed-transactions/${signedTransaction.id}`;
      }),
    },
  });
};

const buildSignedTransactionsSerializer = (
  firstPage: number,
  lastPage: number,
  currentPage: number,
  pageSize: number
): Serializer<Transaction> => {
  return new Serializer<Transaction>("signed-transaction", {
    nullData: false,
    linkers: {
      document: new Linker(() => {
        return `${PROTOCOL}://${HOST}:${PORT}/signed-transactions?page[number]=${currentPage}&page[size]=${pageSize}`;
      }),
      resource: new Linker((signedTransaction: Transaction) => {
        return `${PROTOCOL}://${HOST}:${PORT}/signed-transactions/${signedTransaction.id}`;
      }),
      paginator: new Paginator(() => {
        const nextPage = currentPage + 1;
        const previousPage = currentPage - 1;
        return {
          first: `${PROTOCOL}://${HOST}:${PORT}/signed-transactions?page[number]=${firstPage}&page[size]=${pageSize}`,
          last: `${PROTOCOL}://${HOST}:${PORT}/signed-transactions?page[number]=${lastPage}&page[size]=${pageSize}`,
          next:
            nextPage <= lastPage
              ? `${PROTOCOL}://${HOST}:${PORT}/signed-transactions?page[number]=${nextPage}&page[size]=${pageSize}`
              : null,
          prev:
            previousPage >= 0
              ? `${PROTOCOL}://${HOST}:${PORT}/signed-transactions?page[number]=${previousPage}&page[size]=${pageSize}`
              : null,
        };
      }),
    },
  });
};

const buildBlockTransactionSerializer = (
  block: Block
): Serializer<Transaction> => {
  return new Serializer<Transaction>("transaction", {
    nullData: false,
    relators: [
      new Relator<Transaction, Block>(
        async () => block,
        new Serializer<Block>("block", {
          onlyIdentifier: true,
        }),
        {
          linkers: {
            related: new Linker(() => {
              return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}`;
            }),
          },
        }
      ),
    ],
    linkers: {
      document: new Linker((transactions: Transaction) => {
        return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions/${transactions.id}`;
      }),
      resource: new Linker((transaction: Transaction) => {
        return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions/${transaction.id}`;
      }),
    },
  });
};

const buildBlockTransactionsSerializer = (
  block: Block,
  firstPage: number,
  lastPage: number,
  currentPage: number,
  pageSize: number
): Serializer<Transaction> => {
  return new Serializer<Transaction>("transaction", {
    nullData: false,
    relators: [
      new Relator<Transaction, Block>(
        async () => block,
        new Serializer<Block>("block", {
          onlyIdentifier: true,
        }),
        {
          linkers: {
            related: new Linker(() => {
              return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}`;
            }),
          },
        }
      ),
    ],
    linkers: {
      document: new Linker(() => {
        return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions?page[number]=${currentPage}&page[size]=${pageSize}`;
      }),
      resource: new Linker((transaction: Transaction) => {
        return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions/${transaction.id}`;
      }),
      paginator: new Paginator(() => {
        const nextPage = currentPage + 1;
        const previousPage = currentPage - 1;
        return {
          first: `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions?page[number]=${firstPage}&page[size]=${pageSize}`,
          last: `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions?page[number]=${lastPage}&page[size]=${pageSize}`,
          next:
            nextPage <= lastPage
              ? `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions?page[number]=${nextPage}&page[size]=${pageSize}`
              : null,
          prev:
            previousPage >= 0
              ? `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions?page[number]=${previousPage}&page[size]=${pageSize}`
              : null,
        };
      }),
    },
  });
};

const buildParticipantSerializer = (): Serializer<Participant> => {
  return new Serializer<Participant>("participant", {
    nullData: false,
    linkers: {
      document: new Linker((participants: Participant) => {
        return `${PROTOCOL}://${HOST}:${PORT}/participants/${participants.id}`;
      }),
      resource: new Linker((pendingTransaction: Participant) => {
        return `${PROTOCOL}://${HOST}:${PORT}/participants/${pendingTransaction.id}`;
      }),
    },
  });
};

const buildParticipantsSerializer = (
  firstPage: number,
  lastPage: number,
  currentPage: number,
  pageSize: number
): Serializer<Participant> => {
  return new Serializer<Participant>("participant", {
    nullData: false,
    linkers: {
      document: new Linker(() => {
        return `${PROTOCOL}://${HOST}:${PORT}/participants?page[number]=${currentPage}&page[size]=${pageSize}`;
      }),
      resource: new Linker((pendingTransaction: Participant) => {
        return `${PROTOCOL}://${HOST}:${PORT}/participants/${pendingTransaction.id}`;
      }),
      paginator: new Paginator(() => {
        const nextPage = currentPage + 1;
        const previousPage = currentPage - 1;
        return {
          first: `${PROTOCOL}://${HOST}:${PORT}/participants?page[number]=${firstPage}&page[size]=${pageSize}`,
          last: `${PROTOCOL}://${HOST}:${PORT}/participants?page[number]=${lastPage}&page[size]=${pageSize}`,
          next:
            nextPage <= lastPage
              ? `${PROTOCOL}://${HOST}:${PORT}/participants?page[number]=${nextPage}&page[size]=${pageSize}`
              : null,
          prev:
            previousPage >= 0
              ? `${PROTOCOL}://${HOST}:${PORT}/participants?page[number]=${previousPage}&page[size]=${pageSize}`
              : null,
        };
      }),
    },
  });
};

const buildNodeSerializer = (): Serializer<Node> => {
  return new Serializer<Node>("node", {
    nullData: false,
    linkers: {
      document: new Linker((nodes: Node) => {
        return `${PROTOCOL}://${HOST}:${PORT}/nodes/${nodes.id}`;
      }),
      resource: new Linker((pendingTransaction: Node) => {
        return `${PROTOCOL}://${HOST}:${PORT}/nodes/${pendingTransaction.id}`;
      }),
    },
  });
};

const buildNodesSerializer = (
  firstPage: number,
  lastPage: number,
  currentPage: number,
  pageSize: number
): Serializer<Node> => {
  return new Serializer<Node>("node", {
    nullData: false,
    linkers: {
      document: new Linker(() => {
        return `${PROTOCOL}://${HOST}:${PORT}/nodes?page[number]=${currentPage}&page[size]=${pageSize}`;
      }),
      resource: new Linker((pendingTransaction: Node) => {
        return `${PROTOCOL}://${HOST}:${PORT}/nodes/${pendingTransaction.id}`;
      }),
      paginator: new Paginator(() => {
        const nextPage = currentPage + 1;
        const previousPage = currentPage - 1;
        return {
          first: `${PROTOCOL}://${HOST}:${PORT}/nodes?page[number]=${firstPage}&page[size]=${pageSize}`,
          last: `${PROTOCOL}://${HOST}:${PORT}/nodes?page[number]=${lastPage}&page[size]=${pageSize}`,
          next:
            nextPage <= lastPage
              ? `${PROTOCOL}://${HOST}:${PORT}/nodes?page[number]=${nextPage}&page[size]=${pageSize}`
              : null,
          prev:
            previousPage >= 0
              ? `${PROTOCOL}://${HOST}:${PORT}/nodes?page[number]=${previousPage}&page[size]=${pageSize}`
              : null,
        };
      }),
    },
  });
};

export const init = async (): Promise<Server> => {
  // todo - hide db secrets
  const sequelize = new Sequelize("todd-coin", "postgres", "secret", {
    host: "localhost",
    dialect: "postgres",
  });
  await sequelize.authenticate();

  const DbNode = sequelize.define(
    "Node",
    {
      id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      baseUrl: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "nodes",
    }
  );

  const DbParticipant = sequelize.define(
    "Participant",
    {
      id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      publicKey: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "participants",
    }
  );

  const DbTransaction = sequelize.define(
    "Transaction",
    {
      id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      type: {
        type: DataTypes.STRING,
        values: ["pending", "signed", "block"],
        allowNull: false,
      },
      blockId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      from: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      to: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      amount: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      signature: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "transactions",
    }
  );

  const DbBlock = sequelize.define(
    "Block",
    {
      id: {
        type: DataTypes.STRING,
        allowNull: false,
        primaryKey: true,
      },
      nonce: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      previousHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      hash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "blocks",
    }
  );

  DbBlock.hasMany(DbTransaction, {
    foreignKey: "blockId",
  });

  await sequelize.sync({ force: false, alter: true });

  const genesisBlock: Block = createGenesisBlock();
  await DbBlock.findOrCreate({
    where: {
      id: genesisBlock.id,
    },
    defaults: {
      ...genesisBlock,
    },
  });

  const genesisBlockTransactions = genesisBlock.transactions;

  await Promise.all(
    genesisBlockTransactions.map(async (transaction: Transaction) => {
      return await DbTransaction.findOrCreate({
        where: {
          id: transaction.id,
        },
        defaults: {
          type: "block",
          blockId: genesisBlock.id,
          ...transaction,
        },
      });
    })
  );

  console.log("All models were synchronized successfully.");

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
      const models = await DbBlock.findAll();
      const blocks = models.map((model) => {
        const dbBlock = model.get();

        return {
          id: dbBlock.id,
          createdAt: dbBlock.createdAt,
          updatedAt: dbBlock.updatedAt,
          transactions: dbBlock.transactions,
          nonce: dbBlock.nonce,
          previousHash: dbBlock.previousHash,
          hash: dbBlock.hash,
        };
      });

      return await buildBlocksSerializer(0, 25, 0, 10).serialize(blocks);
    },
  });

  server.route({
    method: "GET",
    path: "/blocks/{blockId}",
    handler: async (request, h) => {
      const { blockId } = request.params;

      const model = await DbBlock.findByPk(blockId);

      if (!model) {
        throw Boom.notFound();
      }

      const dbBlock = model.get();
      const block = {
        id: dbBlock.id,
        createdAt: dbBlock.createdAt,
        updatedAt: dbBlock.updatedAt,
        transactions: dbBlock.transactions,
        nonce: dbBlock.nonce,
        previousHash: dbBlock.previousHash,
        hash: dbBlock.hash,
      };

      return await buildBlockSerializer().serialize(block);
    },
  });

  server.route({
    method: "POST",
    path: "/blocks",
    handler: async (request, h) => {
      const payload = request.payload as Block;

      // todo - validate the block

      const minerPublicKey = request.headers["x-miner-public-key"] as string;

      // todo validate the minerPublicKey

      const newBlock = payload;

      // todo - put all of the following in a transaction

      try {
        const model = await DbBlock.create({
          id: newBlock.id,
          nonce: newBlock.nonce,
          previousHash: newBlock.previousHash,
          hash: newBlock.hash,
        });

        await Promise.all(
          newBlock.transactions.map((transaction: Transaction) => {
            return DbTransaction.update(
              {
                type: "block",
                blockId: newBlock.id,
              },
              {
                where: {
                  id: transaction.id,
                },
              }
            );
          })
        );

        await DbTransaction.create({
          id: v4(),
          type: "signed",
          to: minerPublicKey,
          amount: MINING_REWARD,
          description: "mining reward",
        });

        // todo - notify known nodes that a new block was added

        const dbBlock = model.get();

        return buildBlockSerializer().serialize({
          id: dbBlock.id,
          createdAt: dbBlock.createdAt,
          updatedAt: dbBlock.updatedAt,
          transactions: dbBlock.transactions,
          nonce: dbBlock.nonce,
          previousHash: dbBlock.previousHash,
          hash: dbBlock.hash,
        });
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
      const models = await DbTransaction.findAll({
        where: {
          type: "pending",
        },
      });
      const pendingTransactions = models.map((model) => {
        const dbTransaction = model.get();

        return {
          id: dbTransaction.id,
          createdAt: dbTransaction.createdAt,
          updatedAt: dbTransaction.createdAt,
          from: dbTransaction.from,
          to: dbTransaction.to,
          amount: dbTransaction.amount,
          description: dbTransaction.description,
        };
      });

      return await buildPendingTransactionsSerializer(0, 25, 0, 10).serialize(
        pendingTransactions
      );
    },
  });

  server.route({
    method: "GET",
    path: "/pending-transactions/{pendingTransactionId}",
    handler: async (request, h) => {
      const { pendingTransactionId } = request.params;

      const model = await DbTransaction.findByPk(pendingTransactionId);

      if (!model) {
        throw Boom.notFound();
      }

      const dbPendingTransaction = model.get();

      if (dbPendingTransaction.type !== "pending") {
        throw Boom.badRequest();
      }

      const pendingTransaction: Transaction = {
        id: dbPendingTransaction.id,
        createdAt: dbPendingTransaction.createdAt,
        updatedAt: dbPendingTransaction.createdAt,
        from: dbPendingTransaction.from,
        to: dbPendingTransaction.to,
        amount: dbPendingTransaction.amount,
        description: dbPendingTransaction.description,
      };

      return buildPendingTransactionSerializer().serialize(pendingTransaction);
    },
  });

  server.route({
    method: "POST",
    path: "/pending-transactions",
    handler: async (request: Request, h: ResponseToolkit) => {
      const payload = request.payload as Transaction;

      // todo - validate the pending transaction

      const newPendingTransaction: Transaction = {
        ...payload,
        id: v4(),
      };

      try {
        const model = await DbTransaction.create({
          id: newPendingTransaction.id,
          type: "pending",
          to: newPendingTransaction.to,
          from: newPendingTransaction.from,
          amount: newPendingTransaction.amount,
          description: newPendingTransaction.description,
        });

        const dbTransaction = model.get();

        return buildPendingTransactionSerializer().serialize({
          id: dbTransaction.id,
          createdAt: dbTransaction.createdAt,
          updatedAt: dbTransaction.updatedAt,
          to: newPendingTransaction.to,
          from: newPendingTransaction.from,
          amount: newPendingTransaction.amount,
          description: newPendingTransaction.description,
        });
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
      const models = await DbTransaction.findAll({
        where: {
          type: "signed",
        },
      });
      const signedTransactions = models.map((model) => {
        const dbTransaction = model.get();

        return {
          id: dbTransaction.id,
          createdAt: dbTransaction.createdAt,
          updatedAt: dbTransaction.createdAt,
          from: dbTransaction.from,
          to: dbTransaction.to,
          amount: dbTransaction.amount,
          description: dbTransaction.description,
          signature: dbTransaction.signature,
        };
      });

      return await buildSignedTransactionsSerializer(0, 25, 0, 10).serialize(
        signedTransactions
      );
    },
  });

  server.route({
    method: "GET",
    path: "/signed-transactions/{signedTransactionId}",
    handler: async (request, h) => {
      const { signedTransactionId } = request.params;

      const model = await DbTransaction.findByPk(signedTransactionId);

      if (!model) {
        throw Boom.notFound();
      }

      const dbSignedTransaction = model.get();

      if (dbSignedTransaction.type !== "signed") {
        throw Boom.badRequest();
      }

      const signedTransaction: Transaction = {
        id: dbSignedTransaction.id,
        createdAt: dbSignedTransaction.createdAt,
        updatedAt: dbSignedTransaction.createdAt,
        from: dbSignedTransaction.from,
        to: dbSignedTransaction.to,
        amount: dbSignedTransaction.amount,
        description: dbSignedTransaction.description,
        signature: dbSignedTransaction.signature,
      };

      return buildSignedTransactionSerializer().serialize(signedTransaction);
    },
  });

  server.route({
    method: "POST",
    path: "/signed-transactions",
    handler: async (request: Request, h: ResponseToolkit) => {
      const payload = request.payload as Transaction;

      // todo - validate the signed transaction

      const newSignedTransaction = payload;

      try {
        await DbTransaction.update(
          {
            type: "signed",
            signature: newSignedTransaction.signature,
          },
          {
            where: {
              id: newSignedTransaction.id,
            },
          }
        );
      } catch (error) {
        console.log(error.message);
        throw Boom.internal();
      }

      return buildSignedTransactionSerializer().serialize(newSignedTransaction);
    },
  });

  // Block Transaction Management

  server.route({
    method: "GET",
    path: "/blocks/{blockId}/transactions",
    handler: async (request, h) => {
      const { blockId } = request.params;

      const model = await DbBlock.findByPk(blockId);

      if (!model) {
        throw Boom.notFound();
      }

      const dbBlock = model.get();
      const block = {
        id: dbBlock.id,
        createdAt: dbBlock.createdAt,
        updatedAt: dbBlock.updatedAt,
        transactions: dbBlock.transactions,
        nonce: dbBlock.nonce,
        previousHash: dbBlock.previousHash,
        hash: dbBlock.hash,
      };

      const models = await DbTransaction.findAll({
        where: {
          type: "block",
          blockId: block.id,
        },
      });
      const blockTransactions = models.map((model) => {
        const dbTransaction = model.get();

        return {
          id: dbTransaction.id,
          createdAt: dbTransaction.createdAt,
          updatedAt: dbTransaction.createdAt,
          from: dbTransaction.from,
          to: dbTransaction.to,
          amount: dbTransaction.amount,
          description: dbTransaction.description,
          signature: dbTransaction.signature,
        };
      });

      return await buildBlockTransactionsSerializer(
        block,
        0,
        25,
        0,
        10
      ).serialize(blockTransactions);
    },
  });

  server.route({
    method: "GET",
    path: "/blocks/{blockId}/transactions/{transactionId}",
    handler: async (request, h) => {
      const { transactionId } = request.params;

      const model = await DbTransaction.findByPk(transactionId);

      if (!model) {
        throw Boom.notFound();
      }

      const dbBlockTransaction = model.get();

      if (dbBlockTransaction.type !== "block") {
        throw Boom.badRequest();
      }

      const signedTransaction: Transaction = {
        id: dbBlockTransaction.id,
        createdAt: dbBlockTransaction.createdAt,
        updatedAt: dbBlockTransaction.createdAt,
        from: dbBlockTransaction.from,
        to: dbBlockTransaction.to,
        amount: dbBlockTransaction.amount,
        description: dbBlockTransaction.description,
        signature: dbBlockTransaction.signature,
      };

      return buildSignedTransactionSerializer().serialize(signedTransaction);
    },
  });

  // Participant Management

  server.route({
    method: "GET",
    path: "/participants",
    handler: async (request, h) => {
      const models = await DbParticipant.findAll();
      const participants = models.map((model) => {
        const dbParticipant = model.get();

        return {
          id: dbParticipant.id,
          createdAt: dbParticipant.createdAt,
          updatedAt: dbParticipant.createdAt,
          firstName: dbParticipant.firstName,
          lastName: dbParticipant.lastName,
          email: dbParticipant.email,
          phone: dbParticipant.phone,
          key: { public: dbParticipant.publicKey },
        };
      });

      return buildParticipantsSerializer(0, 25, 0, 10).serialize(participants);
    },
  });

  server.route({
    method: "GET",
    path: "/participants/{participantId}",
    handler: async (request, h) => {
      const { participantId } = request.params;

      const model = await DbParticipant.findByPk(participantId);

      if (!model) {
        throw Boom.notFound();
      }

      const dbParticipant = model.get();
      const participant = {
        id: dbParticipant.id,
        createdAt: dbParticipant.createdAt,
        updatedAt: dbParticipant.createdAt,
        firstName: dbParticipant.firstName,
        lastName: dbParticipant.lastName,
        email: dbParticipant.email,
        phone: dbParticipant.phone,
        key: { public: dbParticipant.publicKey },
      };

      return buildParticipantSerializer().serialize(participant);
    },
  });

  server.route({
    method: "POST",
    path: "/participants",
    handler: async (request: Request, h: ResponseToolkit) => {
      const payload = request.payload as Participant;

      // todo - validate the new participant

      const participantKey = generateParticipantKey();

      const newParticipant: Participant = {
        ...payload,
        id: v4(),
        key: { public: participantKey.public },
      };

      try {
        const model = await DbParticipant.create({
          id: newParticipant.id,
          firstName: newParticipant.firstName,
          lastName: newParticipant.lastName,
          email: newParticipant.email,
          phone: newParticipant.phone,
          publicKey: newParticipant.key.public,
        });

        // todo - notify known nodes that a new participant was added

        const dbParticipant = model.get();

        return buildParticipantSerializer().serialize({
          id: dbParticipant.id,
          createdAt: dbParticipant.createdAt,
          updatedAt: dbParticipant.updatedAt,
          firstName: dbParticipant.firstName,
          lastName: dbParticipant.lastName,
          email: dbParticipant.email,
          phone: dbParticipant.phone,
          key: {
            public: dbParticipant.publicKey,
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
      const models = await DbNode.findAll();
      const nodes = models.map((model) => {
        const dbNode = model.get();

        return {
          id: dbNode.id,
          createdAt: dbNode.createdAt,
          updatedAt: dbNode.updatedAt,
          baseUrl: dbNode.baseUrl,
        };
      });

      return buildNodesSerializer(0, 25, 0, 10).serialize(nodes);
    },
  });

  server.route({
    method: "GET",
    path: "/nodes/{nodeId}",
    handler: async (request, h) => {
      const { nodeId } = request.params;

      const model = await DbNode.findByPk(nodeId);

      if (!model) {
        throw Boom.notFound();
      }

      const dbNode = model.get();
      const node = {
        id: dbNode.id,
        createdAt: dbNode.createdAt,
        updatedAt: dbNode.updatedAt,
        baseUrl: dbNode.baseUrl,
      };

      return buildNodeSerializer().serialize(node);
    },
  });

  server.route({
    method: "POST",
    path: "/nodes",
    handler: async (request: Request, h: ResponseToolkit) => {
      const payload = request.payload as Node;

      // todo - validate the new node

      // todo - once validated, sync up with the new node

      const newNode = {
        ...payload,
        id: v4(),
      };

      try {
        const model = await DbNode.create({
          id: newNode.id,
          baseUrl: newNode.baseUrl,
        });

        // todo - notify known nodes that a new node was added

        const dbNode = model.get();

        return buildNodeSerializer().serialize({
          id: dbNode.id,
          createdAt: dbNode.createdAt,
          updatedAt: dbNode.updatedAt,
          baseUrl: dbNode.baseUrl,
        });
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
