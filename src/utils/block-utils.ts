import { Block, Participant, Roles, Transaction } from "../types";
import {
  DIFFICULTY,
  GENESIS_BLOCK_ID,
  GENESIS_HASH,
  GENESIS_NONCE,
  GENESIS_PARTICIPANT_ID,
  GENESIS_PARTICIPANT_PUBLIC_KEY,
  GENESIS_REWARD,
  GENESIS_TRANSACTION_ID,
} from "../constants";
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
  roles: [Roles.VOLUNTEER],
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
