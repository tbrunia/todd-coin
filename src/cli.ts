#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  getParticipantBalance,
  isChainValid,
} from "./services/blockchain-service";
import { signTransaction } from "./services/transaction-service";
import { ApiData, Block, Participant, Transaction } from "./types";
import { mineNextBlock } from "./services/block-service";
import axios, { AxiosResponse } from "axios";
import _ from "lodash";

const getBlocks = async (): Promise<Block[]> => {
  const blocksResponse: AxiosResponse<{
    data: ApiData[];
  }> = await axios.get(`http://localhost:3000/blocks`);
  return (await Promise.all(
    blocksResponse.data.data.map(async (blockData: ApiData) => {
      const transactionsResponse: AxiosResponse<{
        data: ApiData[];
      }> = await axios.get(
        `http://localhost:3000/blocks/${blockData.id}/transactions`
      );
      const transactions = transactionsResponse.data.data.map(
        (transactionData: ApiData) => ({
          id: transactionData.id,
          ...transactionData.attributes,
        })
      ) as Transaction[];

      return {
        id: blockData.id,
        transactions,
        ...blockData.attributes,
      };
    })
  )) as Block[];
};

const getParticipantById = async (
  participantId: string
): Promise<Participant> => {
  const participantResponse: AxiosResponse<{ data: ApiData }> = await axios.get(
    `http://localhost:3000/participants/${participantId}`
  );
  return {
    id: participantResponse.data.data.id,
    ...participantResponse.data.data.attributes,
  } as Participant;
};

const getSignedTransactions = async (): Promise<Transaction[]> => {
  const signedTransactionsResponse: AxiosResponse<{
    data: ApiData[];
  }> = await axios.get(`http://localhost:3000/signed-transactions`);
  return signedTransactionsResponse.data.data.map((data: ApiData) => ({
    id: data.id,
    ...data.attributes,
  })) as Transaction[];
};

const getPendingTransactionById = async (
  pendingTransactionId: string
): Promise<Transaction> => {
  const pendingTransactionResponse = await axios.get(
    `http://localhost:3000/pending-transactions/${pendingTransactionId}`
  );
  return {
    id: pendingTransactionResponse.data.data.id,
    ...pendingTransactionResponse.data.data.attributes,
  };
};

// todo other operations...
// 1. add pending transaction
// 2. view my pending transactions for signing

// todo make the host a variable

yargs(hideBin(process.argv))
  .command(
    "sign-pending-transaction <privateKey> <pendingTransactionId>",
    "sign a pending todd-coin transaction",
    () => {},
    async (args) => {
      const privateKey = args.privateKey as string;
      const pendingTransactionId = args.pendingTransactionId as string;
      const pendingTransaction: Transaction = await getPendingTransactionById(
        pendingTransactionId
      );
      const signedTransaction: Transaction = signTransaction(
        pendingTransaction,
        privateKey
      );

      console.log(JSON.stringify(signedTransaction, null, 2));
    }
  )
  .command(
    "mine",
    "mine next todd-coin block",
    () => {},
    async (args) => {
      const latestBlock: Block = _.last(await getBlocks());
      const signedTransactions: Transaction[] = await getSignedTransactions();
      const newBlock: Block = mineNextBlock(
        latestBlock,
        new Date().toISOString(),
        signedTransactions
      );

      console.log(JSON.stringify(newBlock, null, 2));
    }
  )
  .command(
    "validate",
    "validate todd-coin",
    () => {},
    async () => {
      const blocks: Block[] = await getBlocks();
      const isValid: boolean = isChainValid(blocks);

      if (isValid) {
        console.log("Looks good!");
      } else {
        console.log("Something's not right.");
      }
    }
  )
  .command(
    "get-balance <participantId>",
    "get todd-coin participant balance",
    () => {},
    async (args) => {
      const participantId = args.participantId as string;
      const participant: Participant = await getParticipantById(participantId);
      const blocks: Block[] = await getBlocks();
      const balance: number = getParticipantBalance(
        blocks,
        participant.key.public
      );

      console.log(`balance: ${balance}`);
    }
  )
  .demandCommand(1)
  .parse();
