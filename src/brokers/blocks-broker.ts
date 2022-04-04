import { Block, Transaction } from "../types";
import { SequelizeClient } from "./sequelize-client";
import { v4 } from "uuid";
import { MAX_TRANSACTIONS_PER_BLOCK, MINING_REWARD } from "../constants";
import { getBlockTransactions } from "./transactions-broker";

const map = (dbBlock): Block => ({
  id: dbBlock.id,
  createdAt: dbBlock.createdAt,
  updatedAt: dbBlock.updatedAt,
  transactions: [],
  nonce: dbBlock.nonce,
  previousHash: dbBlock.previousHash,
  hash: dbBlock.hash,
});

export const getBlockById = async (
  sequelizeClient: SequelizeClient,
  id: string
): Promise<Block | undefined> => {
  const blockModel = sequelizeClient.getBlockModel();

  const model = await blockModel.findByPk(id);

  if (!model) {
    return;
  }

  const dbBlock = model.get();

  const { rows } = await getBlockTransactions(
    sequelizeClient,
    0,
    MAX_TRANSACTIONS_PER_BLOCK,
    dbBlock.id
  );

  return { ...map(dbBlock), transactions: rows };
};

export const getBlocks = async (
  sequelizeClient: SequelizeClient,
  pageNumber: number,
  pageSize: number
): Promise<{ count: number; rows: Block[] }> => {
  const blockModel = sequelizeClient.getBlockModel();

  const { count, rows } = await blockModel.findAndCountAll({
    offset: pageNumber * pageSize,
    order: [["createdAt", "ASC"]],
    limit: pageSize,
  });

  return {
    count,
    rows: await Promise.all(
      rows.map(async (model) => {
        const dbBlock = model.get();

        const { rows } = await getBlockTransactions(
          sequelizeClient,
          0,
          MAX_TRANSACTIONS_PER_BLOCK,
          dbBlock.id
        );

        return { ...map(dbBlock), transactions: rows };
      })
    ),
  };
};

export const createBlock = async (
  sequelizeClient: SequelizeClient,
  newBlock: Block,
  minerPublicKey: string
): Promise<Block> => {
  // todo - put all of the following in a transaction

  const blockModel = sequelizeClient.getBlockModel();

  const model = await blockModel.create({
    id: newBlock.id || v4(),
    nonce: newBlock.nonce,
    previousHash: newBlock.previousHash,
    hash: newBlock.hash,
  });

  const transactionModel = sequelizeClient.getTransactionModel();

  await Promise.all(
    newBlock.transactions.map((transaction: Transaction) => {
      return transactionModel.update(
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

  await transactionModel.create({
    id: v4(),
    type: "signed",
    to: minerPublicKey,
    amount: MINING_REWARD,
    description: "mining reward",
  });

  const dbBlock = model.get();

  const { rows } = await getBlockTransactions(
    sequelizeClient,
    0,
    MAX_TRANSACTIONS_PER_BLOCK,
    dbBlock.id
  );

  return { ...map(dbBlock), transactions: rows };
};
