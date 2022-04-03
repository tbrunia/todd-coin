import { DataTypes, Sequelize } from "sequelize";
import { Block, Participant, Transaction } from "../types";
import {
  createGenesisBlock,
  createGenesisParticipant,
} from "../services/block-utils";

export class SequelizeClient {
  private sequelize: Sequelize;
  private nodeModel;
  private participantModel;
  private transactionModel;
  private blockModel;

  async init() {
    const database = process.env.DB_NAME || "todd-coin";
    const username = process.env.DB_USERNAME || "postgres";
    const password = process.env.DB_PASSWORD || "secret";
    const host = process.env.DB_HOST || "localhost";
    const port = Number(process.env.DB_PORT) || 5432;

    this.sequelize = new Sequelize(database, username, password, {
      host,
      port,
      dialect: "postgres",
    });

    this.nodeModel = this.sequelize.define(
      "Node",
      {
        id: {
          type: DataTypes.STRING,
          allowNull: false,
          primaryKey: true,
        },
        baseUrl: {
          type: DataTypes.STRING,
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
          type: DataTypes.STRING,
          allowNull: false,
          primaryKey: true,
        },
        firstName: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        lastName: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        email: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        phone: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        publicKey: {
          type: DataTypes.STRING,
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
          type: DataTypes.STRING,
          allowNull: false,
          primaryKey: true,
        },
        type: {
          type: DataTypes.STRING,
          values: ["pending", "signed", "block"],
          allowNull: false,
        },
        blockId: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        from: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        to: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        amount: {
          type: DataTypes.BIGINT,
          allowNull: false,
        },
        description: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        signature: {
          type: DataTypes.STRING,
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
          type: DataTypes.STRING,
          allowNull: false,
          primaryKey: true,
        },
        nonce: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        previousHash: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        hash: {
          type: DataTypes.STRING,
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
}