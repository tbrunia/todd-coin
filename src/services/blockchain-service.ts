import { Block, Blockchain, Transaction } from "../types";
import {
  calculateBlockHash,
  hasValidTransactions,
} from "./block-service";
import { DIFFICULTY, GENESIS_REWARD, MINING_REWARD } from "../constants";

const GENESIS_DATE = "2022-03-14T13:39:00.000Z";
const GENESIS_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000";
const GENESIS_PARTICIPANT = {
  id: "0dd9bf1d-544c-4d9a-beb3-8bc0d8024db4",
  creationDate: GENESIS_DATE,
  key: {
    public:
      "049976c498d31064539767b4ca5e7383e9c2d1f9305bccdcd476e0e8c24872dfa7d1940bf433d6a431c23813594882126d49b21ebadd1fe00ef50dd8262000d73b",
  },
};
const GENESIS_BLOCK_ID = "6daed5b3-86fb-4c68-945f-87fac9cbe846";
const GENESIS_TRANSACTION_ID = "13b155a6-da09-4e9c-ba13-9c78bdc87443";
const GENESIS_TRANSACTIONS: Transaction[] = [
  {
    id: GENESIS_TRANSACTION_ID,
    to: GENESIS_PARTICIPANT.key.public,
    amount: GENESIS_REWARD,
    description: "Initial set up reward",
    createdAt: GENESIS_DATE,
  },
];
const GENESIS_NONCE = 0;
const GENESIS_BLOCK: Block = {
  id: GENESIS_BLOCK_ID,
  createdAt: GENESIS_DATE,
  transactions: GENESIS_TRANSACTIONS,
  nonce: GENESIS_NONCE,
  previousHash: GENESIS_HASH,
  hash: calculateBlockHash(
    GENESIS_DATE,
    GENESIS_HASH,
    GENESIS_NONCE,
    GENESIS_TRANSACTIONS
  ),
};

export const createGenesisBlock = (): Block => GENESIS_BLOCK;

export const getLatestBlock = (blockchain: Blockchain): Block =>
  blockchain.chain[blockchain.chain.length - 1];

export const isChainValid = (blocks: Block[]): boolean => {
  for (let i = 1; i < blocks.length; i++) {
    const previousBlock = blocks[i - 1];
    const currentBlock = blocks[i];

    if (!hasValidTransactions(currentBlock)) {
      return false;
    }

    if (
      currentBlock.hash !==
      calculateBlockHash(
        currentBlock.createdAt,
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
  blocks: Block[],
  participantPublicKey: string
): number =>
  blocks.reduce((chainBalance: number, block: Block) => {
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
