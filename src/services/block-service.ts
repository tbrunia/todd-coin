import { Block, Transaction } from "../types";
import { DIFFICULTY } from "../constants";
import { isSignedTransactionValid } from "./transaction-service";
import { v4 } from "uuid";

const SHA256 = require("crypto-js/sha256");

export const calculateBlockHash = (
  createdAt: string,
  previousHash: string,
  nonce: number,
  signedTransactions: Transaction[]
): string => {
  const parts =
    previousHash + createdAt + nonce + JSON.stringify(signedTransactions);

  return SHA256(parts).toString();
};

export const mineNextBlock = (
  latestBlock: Block,
  createdAt: string,
  signedTransactions: Transaction[]
): Block => {
  let nonce = 0;
  let tempHash = calculateBlockHash(
    createdAt,
    latestBlock.hash,
    nonce,
    signedTransactions
  );
  const leadingZeros = Array(DIFFICULTY + 1).join("0");

  while (tempHash.substring(0, DIFFICULTY) !== leadingZeros) {
    tempHash = calculateBlockHash(
      createdAt,
      latestBlock.hash,
      nonce,
      signedTransactions
    );
    nonce = nonce + 1;
  }

  return {
    id: v4(),
    createdAt,
    transactions: signedTransactions,
    nonce,
    previousHash: latestBlock.hash,
    hash: calculateBlockHash(
      createdAt,
      latestBlock.hash,
      nonce,
      signedTransactions
    ),
  };
};

export const hasValidTransactions = (block: Block): boolean => {
  for (const transaction of block.transactions) {
    if (!isSignedTransactionValid(transaction)) {
      return false;
    }
  }

  return true;
};
