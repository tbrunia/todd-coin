import { Block, Transaction } from "../types";
import { calculateBlockHash, hasValidTransactions } from "./block-utils";

export const isChainValid = (blocks: Block[]): boolean => {
  for (let i = 1; i < blocks.length; i++) {
    const previousBlock = blocks[i - 1];
    const currentBlock = blocks[i];

    if (currentBlock.previousHash !== previousBlock.hash) {
      return false;
    }

    if (!hasValidTransactions(currentBlock)) {
      return false;
    }

    if (currentBlock.hash !== calculateBlockHash(currentBlock)) {
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
            return transactionBalance + Number(transaction.amount);
          }

          if (transaction.from === participantPublicKey) {
            return transactionBalance - Number(transaction.amount);
          }

          return transactionBalance;
        },
        0
      )
    );
  }, 0);
