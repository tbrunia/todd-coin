import { Transaction } from "../types";
import { SequelizeClient } from "./sequelize-client";
import { v4 } from "uuid";

const map = (dbTransaction): Transaction => ({
  id: dbTransaction.id,
  createdAt: dbTransaction.createdAt,
  updatedAt: dbTransaction.updatedAt,
  to: dbTransaction.to,
  from: dbTransaction.from,
  amount: dbTransaction.amount,
  description: dbTransaction.description,
  signature: dbTransaction.signature,
});

export const getPendingTransactionById = async (
  sequelizeClient: SequelizeClient,
  pendingTransactionId: string
): Promise<Transaction | undefined> => {
  const transactionModel = sequelizeClient.getTransactionModel();

  const model = await transactionModel.findByPk(pendingTransactionId);

  if (!model) {
    return;
  }

  const dbTransaction = model.get();

  if (dbTransaction.type !== "pending") {
    return;
  }

  return map(dbTransaction);
};

export const getSignedTransactionById = async (
  sequelizeClient: SequelizeClient,
  signedTransactionId: string
): Promise<Transaction | undefined> => {
  const transactionModel = sequelizeClient.getTransactionModel();

  const model = await transactionModel.findByPk(signedTransactionId);

  if (!model) {
    return;
  }

  const dbTransaction = model.get();

  if (dbTransaction.type !== "signed") {
    return;
  }

  return map(dbTransaction);
};

export const getBlockTransactionById = async (
  sequelizeClient: SequelizeClient,
  blockId: string,
  blockTransactionId: string
): Promise<Transaction | undefined> => {
  const transactionModel = sequelizeClient.getTransactionModel();

  const model = await transactionModel.findByPk(blockTransactionId);

  if (!model) {
    return;
  }

  const dbTransaction = model.get();

  if (dbTransaction.type !== "block" || dbTransaction.blockId !== blockId) {
    return;
  }

  return map(dbTransaction);
};

export const getPendingTransactions = async (
  sequelizeClient: SequelizeClient
): Promise<Transaction[]> => {
  const transactionModel = sequelizeClient.getTransactionModel();

  const models = await transactionModel.findAll({
    where: {
      type: "pending",
    },
  });

  return models.map((model) => {
    const dbTransaction = model.get();

    return map(dbTransaction);
  });
};

export const getSignedTransactions = async (
  sequelizeClient: SequelizeClient
): Promise<Transaction[]> => {
  const transactionModel = sequelizeClient.getTransactionModel();

  const models = await transactionModel.findAll({
    where: {
      type: "signed",
    },
  });

  return models.map((model) => {
    const dbTransaction = model.get();

    return map(dbTransaction);
  });
};

export const getBlockTransactions = async (
  sequelizeClient: SequelizeClient,
  blockId: string
): Promise<Transaction[]> => {
  const transactionModel = sequelizeClient.getTransactionModel();

  const models = await transactionModel.findAll({
    where: {
      type: "block",
      blockId,
    },
  });

  return models.map((model) => {
    const dbTransaction = model.get();

    return map(dbTransaction);
  });
};

export const createPendingTransaction = async (
  sequelizeClient: SequelizeClient,
  newPendingTransaction: Transaction
): Promise<Transaction> => {
  const transactionModel = sequelizeClient.getTransactionModel();

  const model = await transactionModel.create({
    id: newPendingTransaction.id || v4(),
    type: "pending",
    to: newPendingTransaction.to,
    from: newPendingTransaction.from,
    amount: newPendingTransaction.amount,
    description: newPendingTransaction.description,
    signature: undefined,
  });

  const dbTransaction = model.get();

  return map(dbTransaction);
};

export const createSignedTransaction = async (
  sequelizeClient: SequelizeClient,
  newSignedTransaction: Transaction
): Promise<Transaction> => {
  const transactionModel = sequelizeClient.getTransactionModel();

  const { id, signature } = newSignedTransaction;

  await transactionModel.update(
    {
      type: "signed",
      signature: signature,
    },
    {
      where: {
        id,
      },
    }
  );

  const model = await transactionModel.findByPk(id);

  const dbTransaction = model.get();

  return map(dbTransaction);
};
