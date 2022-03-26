import { Transaction } from "../types";
import { ec } from "elliptic";

const client: ec = new ec("secp256k1");
const SHA256 = require("crypto-js/sha256");

const calculateHash = (transaction: Transaction): string => {
  return SHA256(
    transaction.from +
      transaction.to +
      transaction.amount +
      transaction.description
  ).toString();
};

export const signTransaction = (
  transaction: Transaction,
  signingKey: ec.KeyPair
): Transaction => {
  if (signingKey.getPublic("hex") !== transaction.from) {
    throw new Error("You cannot sign transaction.");
  }

  const hash = calculateHash(transaction);
  const signature = signingKey.sign(hash, "base64");

  return {
    ...transaction,
    signature: signature.toDER("hex"),
  };
};

export const isTransactionValid = (transaction: Transaction) => {
  if (transaction.from === undefined) {
    return true;
  }

  if (
    transaction.signature === undefined ||
    transaction.signature.length === 0
  ) {
    throw new Error("No signature in this transaction");
  }

  const publicKey = client.keyFromPublic(transaction.from, "hex");

  return publicKey.verify(calculateHash(transaction), transaction.signature);
};
