#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  addTransaction,
  getParticipantBalance,
  initBlockchain,
  isChainValid,
  minePendingTransactions,
} from "./blockchain-utils";
import { readFileSync, writeFileSync } from "fs";
import { signTransaction } from "./transaction-utils";
import { ec } from "elliptic";
import {Participant, ParticipantKey} from "./types";
import { v4 } from "uuid";
import { generateParticipantKey } from "./key-generator";

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
    "participant <first> <last> <email> <phone>",
    "create a todd-coin participant",
    () => {},
    (args) => {
      const participantsBefore = JSON.parse(
        readFileSync("participants.json").toString()
      );
      const first = args.first as string;
      const last = args.last as string;
      const email = args.email as string;
      const phone = args.phone as string;
      const participantKey = generateParticipantKey();
      const newParticipant: Participant = {
        id: v4(),
        first,
        last,
        email,
        phone,
        key: { public: participantKey.public },
      };
      const participantsAfter = {
        ...participantsBefore,
        participants: participantsBefore.participants.concat(newParticipant),
      };
      writeFileSync(
        "participants.json",
        JSON.stringify(participantsAfter, null, 2)
      );
      console.log(`Done! The new participant private key is: ${participantKey.private}`);
    }
  )
  .command(
    "add <fromPrivateKey> <fromPublicKey> <toPublicKey> <amount> <description>",
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
    "balance <publicKey>",
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
