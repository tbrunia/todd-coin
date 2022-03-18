import { Block, Blockchain, Transaction } from "./types";
import { calculateHash, hasValidTransactions, mineBlock } from "./block-utils";
import { DIFFICULTY, GENESIS_REWARD, MINING_REWARD } from "./constants";
import { isTransactionValid } from "./transaction-utils";

const GENESIS_DATE = "2022-03-14T13:39:00.000Z";
const GENESIS_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000";
const GENESIS_PARTICIPANT = {
  id: "0dd9bf1d-544c-4d9a-beb3-8bc0d8024db4",
  name: "Todd",
  key: {
    public:
      "049976c498d31064539767b4ca5e7383e9c2d1f9305bccdcd476e0e8c24872dfa7d1940bf433d6a431c23813594882126d49b21ebadd1fe00ef50dd8262000d73b",
  },
};
const GENESIS_TRANSACTIONS = [
  {
    to: GENESIS_PARTICIPANT.key.public,
    amount: GENESIS_REWARD,
    description: "Initial set up reward",
  },
];
const GENESIS_NONCE = 0;

export const createGenesisBlock = (): Block => ({
  timestamp: GENESIS_DATE,
  transactions: GENESIS_TRANSACTIONS,
  nonce: GENESIS_NONCE,
  previousHash: GENESIS_HASH,
  hash: calculateHash(
    GENESIS_DATE,
    GENESIS_HASH,
    GENESIS_NONCE,
    GENESIS_TRANSACTIONS
  ),
});

export const initBlockchain = (): Blockchain => {
  return {
    chain: [createGenesisBlock()],
    pendingTransactions: [],
    participants: [GENESIS_PARTICIPANT],
    difficulty: DIFFICULTY,
    miningReward: MINING_REWARD,
  };
};

export const addTransaction = (
  blockchain: Blockchain,
  transaction: Transaction
): Blockchain => {
  if (!transaction.from || !transaction.to) {
    throw new Error("Transactions must include from and to addresses");
  }

  if (!isTransactionValid(transaction)) {
    throw new Error("Cannot add invalid transaction to the chain");
  }

  return {
    ...blockchain,
    pendingTransactions: blockchain.pendingTransactions.concat([transaction]),
  };
};

export const minePendingTransactions = (
  blockchain: Blockchain,
  miner: string
): Blockchain => {
  if (blockchain.pendingTransactions.length === 0) {
    return blockchain;
  }

  const newBlock = mineBlock(
    blockchain,
    new Date().toISOString(),
    blockchain.pendingTransactions
  );

  return {
    ...blockchain,
    pendingTransactions: [
      {
        to: miner,
        amount: blockchain.miningReward,
        description: "Mining reward",
      },
    ],
    chain: blockchain.chain.concat(newBlock),
  };
};

export const getLatestBlock = (blockchain: Blockchain): Block =>
  blockchain.chain[blockchain.chain.length - 1];

export const isChainValid = (blockchain: Blockchain): boolean => {
  const { chain } = blockchain;

  for (let i = 1; i < chain.length; i++) {
    const previousBlock = chain[i - 1];
    const currentBlock = chain[i];

    if (!hasValidTransactions(currentBlock)) {
      return false;
    }

    if (
      currentBlock.hash !==
      calculateHash(
        currentBlock.timestamp,
        previousBlock.hash,
        currentBlock.nonce,
        currentBlock.transactions
      )
    ) {
      return false;
    }

    if (currentBlock.previousHash !== previousBlock.hash) {
      return false;
    }
  }

  return true;
};

export const getParticipantBalance = (
  blockchain: Blockchain,
  participantPublicKey: string
): number =>
  blockchain.chain.reduce((chainBalance: number, block: Block) => {
    return (
      chainBalance +
      block.transactions.reduce(
        (transactionBalance: number, transaction: Transaction) => {
          if (transaction.to === participantPublicKey) {
            return transactionBalance + transaction.amount;
          }

          if (transaction.from === participantPublicKey) {
            return transactionBalance - transaction.amount;
          }

          return transactionBalance;
        },
        0
      )
    );
  }, 0);
