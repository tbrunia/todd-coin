import { Transaction } from "../types";
import { ec } from "elliptic";

const client: ec = new ec("secp256k1");
const SHA256 = require("crypto-js/sha256");

const calculateTransactionHash = (transaction: Transaction): string => {
  return SHA256(
    transaction.from +
      transaction.to +
      transaction.amount +
      transaction.description +
      transaction.createdAt
  ).toString();
};

export const signTransaction = (
  pendingTransaction: Transaction,
  privateKey: string
): Transaction => {
  const signingKey: ec.KeyPair = client.keyFromPrivate(privateKey);
  if (signingKey.getPublic("hex") !== pendingTransaction.from) {
    throw new Error("You cannot sign transaction.");
  }

  const transactionHash = calculateTransactionHash(pendingTransaction);
  const signature = signingKey.sign(transactionHash, "base64");

  return {
    id: pendingTransaction.id,
    createdAt: pendingTransaction.createdAt,
    from: pendingTransaction.from,
    to: pendingTransaction.to,
    amount: pendingTransaction.amount,
    description: pendingTransaction.description,
    signature: signature.toDER("hex"),
  };
};

export const isSignedTransactionValid = (signedTransaction: Transaction) => {
  if (signedTransaction.from === undefined) {
    return true;
  }

  if (
    signedTransaction.signature === undefined ||
    signedTransaction.signature.length === 0
  ) {
    throw new Error("No signature in this signed transaction");
  }

  const publicKey = client.keyFromPublic(signedTransaction.from, "hex");

  return publicKey.verify(
    calculateTransactionHash(signedTransaction),
    signedTransaction.signature
  );
};
