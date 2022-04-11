import * as sequelize from "sequelize";
import { Block, Participant, Transaction } from "../types";
import {
  createGenesisBlock,
  createGenesisParticipant,
} from "../utils/block-utils";

const { Client } = require("pg");

export class SequelizeClient {
  private sequelize: sequelize.Sequelize;
  private nodeModel;
  private participantModel;
  private transactionModel;
  private blockModel;

  async init(
    database: string,
    username: string,
    password: string,
    host: string,
    port: number
  ) {
    let client;
    try {
      client = new Client({
        user: username,
        password,
        host,
        port,
      });
      await client.connect();
      await client.query(`CREATE DATABASE "${database}"`);
    } catch (error) {
      console.error(error);
    } finally {
      await client.end();
    }

    this.sequelize = new sequelize.Sequelize(database, username, password, {
      host,
      port,
      dialect: "postgres",
    });

    this.nodeModel = this.sequelize.define(
      "Node",
      {
        id: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
          primaryKey: true,
        },
        baseUrl: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
        },
      },
      {
        tableName: "nodes",
      }
    );

    this.participantModel = this.sequelize.define(
      "Participant",
      {
        id: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
          primaryKey: true,
        },
        firstName: {
          type: sequelize.DataTypes.STRING,
          allowNull: true,
        },
        lastName: {
          type: sequelize.DataTypes.STRING,
          allowNull: true,
        },
        email: {
          type: sequelize.DataTypes.STRING,
          allowNull: true,
        },
        phone: {
          type: sequelize.DataTypes.STRING,
          allowNull: true,
        },
        publicKey: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
        },
        roles: {
          type: sequelize.DataTypes.ARRAY(sequelize.DataTypes.STRING),
          allowNull: false,
        },
      },
      {
        tableName: "participants",
      }
    );

    this.transactionModel = this.sequelize.define(
      "Transaction",
      {
        id: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
          primaryKey: true,
        },
        type: {
          type: sequelize.DataTypes.STRING,
          values: ["pending", "signed", "block"],
          allowNull: false,
        },
        blockId: {
          type: sequelize.DataTypes.STRING,
          allowNull: true,
        },
        from: {
          type: sequelize.DataTypes.STRING,
          allowNull: true,
        },
        to: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
        },
        amount: {
          type: sequelize.DataTypes.BIGINT,
          allowNull: false,
        },
        description: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
        },
        signature: {
          type: sequelize.DataTypes.STRING,
          allowNull: true,
        },
      },
      {
        tableName: "transactions",
      }
    );

    this.blockModel = this.sequelize.define(
      "Block",
      {
        id: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
          primaryKey: true,
        },
        nonce: {
          type: sequelize.DataTypes.INTEGER,
          allowNull: false,
        },
        previousHash: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
        },
        hash: {
          type: sequelize.DataTypes.STRING,
          allowNull: false,
        },
      },
      {
        tableName: "blocks",
      }
    );

    this.blockModel.hasMany(this.transactionModel, {
      foreignKey: "blockId",
    });

    await this.sequelize.sync({ force: false, alter: true });

    const genesisParticipant: Participant = createGenesisParticipant();

    await this.participantModel.findOrCreate({
      where: {
        id: genesisParticipant.id,
      },
      defaults: {
        ...genesisParticipant,
        publicKey: genesisParticipant.key.public,
      },
    });

    const genesisBlock: Block = createGenesisBlock();

    await this.blockModel.findOrCreate({
      where: {
        id: genesisBlock.id,
      },
      defaults: {
        ...genesisBlock,
      },
    });

    const genesisBlockTransactions = genesisBlock.transactions;

    await Promise.all(
      genesisBlockTransactions.map(async (transaction: Transaction) => {
        return await this.transactionModel.findOrCreate({
          where: {
            id: transaction.id,
          },
          defaults: {
            type: "block",
            blockId: genesisBlock.id,
            ...transaction,
          },
        });
      })
    );

    console.log("All models were synchronized successfully.");
  }

  getNodeModel() {
    return this.nodeModel;
  }

  getParticipantModel() {
    return this.participantModel;
  }

  getTransactionModel() {
    return this.transactionModel;
  }

  getBlockModel() {
    return this.blockModel;
  }

  async transaction<T>(
    autoCallback: (t: sequelize.Transaction) => PromiseLike<T>
  ): Promise<T> {
    return await this.sequelize.transaction<T>(autoCallback);
  }
}
