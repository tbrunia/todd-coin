#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  addTransaction,
  getParticipantBalance,
  initBlockchain,
  isChainValid,
  minePendingTransactions,
} from "./services/blockchain-service";
import { readFileSync, writeFileSync } from "fs";
import { signTransaction } from "./services/transaction-service";
import { ec } from "elliptic";
import { Participant } from "./types";
import { v4 } from "uuid";
import { generateParticipantKey } from "./services/key-generator";

yargs(hideBin(process.argv))
  .command(
    "init",
    "initialize todd-coin",
    () => {},
    () => {
      const toddCoin = initBlockchain();
      writeFileSync("todd-coin.json", JSON.stringify(toddCoin, null, 2));
      console.log("Done!");
    }
  )
  .command(
    "add-participant <name>",
    "create a todd-coin participant",
    () => {},
    (args) => {
      const toddCoinBefore = JSON.parse(
        readFileSync("todd-coin.json").toString()
      );
      const name = args.name as string;
      const participantKey = generateParticipantKey();
      const newParticipant: Participant = {
        id: v4(),
        firstName: name,
        key: { public: participantKey.public },
      };
      const toddCoinAfter = {
        ...toddCoinBefore,
        participants: toddCoinBefore.participants.concat(newParticipant),
      };
      writeFileSync("todd-coin.json", JSON.stringify(toddCoinAfter, null, 2));
      console.log(
        `Done! The new participant private key is: ${participantKey.private}`
      );
    }
  )
  .command(
    "add-transaction <fromPrivateKey> <fromPublicKey> <toPublicKey> <amount> <description>",
    "add a transaction to todd-coin",
    () => {},
    (args) => {
      const toddCoinBefore = JSON.parse(
        readFileSync("todd-coin.json").toString()
      );
      const client: ec = new ec("secp256k1");
      const fromPrivateKey = args.fromPrivateKey as string;
      const fromPublicKey = args.fromPublicKey as string;
      const toPublicKey = args.toPublicKey as string;
      const amount = args.amount as number;
      const description = args.description as string;
      const toddCoinAfter = addTransaction(
        toddCoinBefore,
        signTransaction(
          {
            id: v4(),
            from: fromPublicKey,
            to: toPublicKey,
            amount: amount,
            description: description,
          },
          client.keyFromPrivate(fromPrivateKey)
        )
      );
      writeFileSync("todd-coin.json", JSON.stringify(toddCoinAfter, null, 2));
      console.log("Done!");
    }
  )
  .command(
    "mine <publicKey>",
    "mine pending todd-coin transactions",
    () => {},
    (args) => {
      const toddCoinPreMine = JSON.parse(
        readFileSync("todd-coin.json").toString()
      );
      const publicKey = args.publicKey as string;
      const toddCoinPostMine = minePendingTransactions(
        toddCoinPreMine,
        publicKey
      );
      writeFileSync(
        "todd-coin.json",
        JSON.stringify(toddCoinPostMine, null, 2)
      );
      console.log("Done!");
    }
  )
  .command(
    "validate",
    "validate todd-coin file",
    () => {},
    () => {
      const toddCoin = JSON.parse(readFileSync("todd-coin.json").toString());
      if (isChainValid(toddCoin)) {
        console.log("Looks good!");
      } else {
        console.log("Something's not right.");
      }
    }
  )
  .command(
    "get-balance <publicKey>",
    "get todd-coin participant balance",
    () => {},
    (args) => {
      const toddCoin = JSON.parse(readFileSync("todd-coin.json").toString());
      const publicKey = args.publicKey as string;
      const balance = getParticipantBalance(toddCoin, publicKey);
      console.log(`balance: ${balance}`);
    }
  )
  .demandCommand(1)
  .parse();
