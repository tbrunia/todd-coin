import { Block, Blockchain, Transaction } from "./types";
import { getLatestBlock } from "./blockchain-utils";
import { DIFFICULTY } from "./constants";
import { isTransactionValid } from "./transaction-utils";

const SHA256 = require("crypto-js/sha256");

export const calculateHash = (
  timestamp: string,
  previousHash: string,
  nonce: number,
  transactions: Transaction[]
): string => {
  const parts = previousHash + timestamp + nonce + JSON.stringify(transactions);

  return SHA256(parts).toString();
};

export const mineBlock = (
  blockchain: Blockchain,
  timestamp: string,
  transactions: Transaction[]
): Block => {
  const latestBlock = getLatestBlock(blockchain);

  let nonce = 0;
  let tempHash = calculateHash(
    timestamp,
    latestBlock.hash,
    nonce,
    transactions
  );
  const leadingZeros = Array(DIFFICULTY + 1).join("0");

  while (tempHash.substring(0, DIFFICULTY) !== leadingZeros) {
    tempHash = calculateHash(timestamp, latestBlock.hash, nonce, transactions);
    nonce = nonce + 1;
  }

  return {
    timestamp,
    transactions,
    nonce,
    previousHash: latestBlock.hash,
    hash: calculateHash(timestamp, latestBlock.hash, nonce, transactions),
  };
};

export const hasValidTransactions = (block: Block): boolean => {
  for (const transaction of block.transactions) {
    if (!isTransactionValid(transaction)) {
      return false;
    }
  }

  return true;
};
