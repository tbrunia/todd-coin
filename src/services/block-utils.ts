import { Block, Participant, Transaction } from "../types";
import { DIFFICULTY, GENESIS_REWARD } from "../constants";
import {
  calculateTransactionHash,
  isSignedTransactionValid,
} from "./transaction-utils";
import { v4 } from "uuid";

const SHA256 = require("crypto-js/sha256");

export const calculateBlockHash = (block: Omit<Block, "hash">): string => {
  const { id, transactions, nonce, previousHash } = block;
  const transactionsPart = JSON.stringify(
    transactions.map((transaction: Transaction) =>
      calculateTransactionHash(transaction)
    )
  );
  const nonceAsStr = nonce.toString();

  const parts = id + transactionsPart + nonceAsStr + previousHash;

  return SHA256(parts).toString();
};

const GENESIS_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000";
const GENESIS_PARTICIPANT_ID = "0dd9bf1d-544c-4d9a-beb3-8bc0d8024db4";
const GENESIS_PARTICIPANT_PUBLIC_KEY =
  "049976c498d31064539767b4ca5e7383e9c2d1f9305bccdcd476e0e8c24872dfa7d1940bf433d6a431c23813594882126d49b21ebadd1fe00ef50dd8262000d73b";
const GENESIS_BLOCK_ID = "6daed5b3-86fb-4c68-945f-87fac9cbe846";
const GENESIS_TRANSACTION_ID = "13b155a6-da09-4e9c-ba13-9c78bdc87443";
const GENESIS_NONCE = 0;

export const createGenesisBlock = (): Block => {
  const genesisBlockNetHash: Omit<Block, "hash"> = {
    id: GENESIS_BLOCK_ID,
    transactions: [
      {
        id: GENESIS_TRANSACTION_ID,
        to: GENESIS_PARTICIPANT_PUBLIC_KEY,
        amount: GENESIS_REWARD,
        description: "Initial set up reward",
      },
    ],
    nonce: GENESIS_NONCE,
    previousHash: GENESIS_HASH,
  };
  const hash: string = calculateBlockHash(genesisBlockNetHash);
  return {
    ...genesisBlockNetHash,
    hash,
  };
};

export const createGenesisParticipant = (): Participant => ({
  id: GENESIS_PARTICIPANT_ID,
  firstName: "Todd",
  lastName: "Brunia",
  key: {
    public: GENESIS_PARTICIPANT_PUBLIC_KEY,
  },
});

export const mineNextBlock = (
  latestBlock: Block,
  createdAt: string,
  signedTransactions: Transaction[]
): Block => {
  let newBlockNetHash: Omit<Block, "hash"> = {
    id: v4(),
    createdAt,
    updatedAt: createdAt,
    transactions: signedTransactions,
    nonce: 0,
    previousHash: latestBlock.hash,
  };
  let hash = calculateBlockHash(newBlockNetHash);

  const leadingZeros = Array(DIFFICULTY + 1).join("0");

  while (hash.substring(0, DIFFICULTY) !== leadingZeros) {
    newBlockNetHash = {
      ...newBlockNetHash,
      nonce: newBlockNetHash.nonce + 1,
    };
    hash = calculateBlockHash(newBlockNetHash);
  }

  return { ...newBlockNetHash, hash };
};

export const hasValidTransactions = (block: Block): boolean => {
  for (const transaction of block.transactions) {
    if (!isSignedTransactionValid(transaction)) {
      return false;
    }
  }

  return true;
};
