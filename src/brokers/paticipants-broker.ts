import { Participant } from "../types";
import { SequelizeClient } from "./sequelize-client";
import { Model } from "sequelize";
import { v4 } from "uuid";
import _ from "lodash";
import { buildWhere } from "./broker-utils";

const map = (dbParticipant): Participant => ({
  id: dbParticipant.id,
  createdAt: dbParticipant.createdAt,
  updatedAt: dbParticipant.createdAt,
  firstName: dbParticipant.firstName,
  lastName: dbParticipant.lastName,
  email: dbParticipant.email,
  phone: dbParticipant.phone,
  key: { public: dbParticipant.publicKey },
});

export const getParticipantById = async (
  sequelizeClient: SequelizeClient,
  id: string
): Promise<Participant | undefined> => {
  const participantModel = sequelizeClient.getParticipantModel();

  const model = await participantModel.findByPk(id);

  if (!model) {
    return;
  }

  const dbParticipant = model.get();

  return map(dbParticipant);
};

export const getParticipantByPublicKey = async (
  sequelizeClient: SequelizeClient,
  publicKey: string
): Promise<Participant | undefined> => {
  const participantModel = sequelizeClient.getParticipantModel();

  const models: Model[] = await participantModel.findAll({
    where: {
      publicKey,
    },
  });

  // todo - throw an error if there are more than one matching record

  const model = _.first(models);

  const dbParticipant = model.get();

  return map(dbParticipant);
};

export const getParticipants = async (
  sequelizeClient: SequelizeClient,
  pageNumber: number,
  pageSize: number,
  publicKey?: string
): Promise<{ count: number; rows: Participant[] }> => {
  const participantModel = sequelizeClient.getParticipantModel();

  const { count, rows } = await participantModel.findAndCountAll({
    where: buildWhere({ publicKey }),
    offset: pageNumber * pageSize,
    order: [["createdAt", "ASC"]],
    limit: pageSize,
  });

  return {
    count,
    rows: rows.map((model: Model) => {
      const dbParticipant = model.get();

      return map(dbParticipant);
    }),
  };
};

export const createParticipant = async (
  sequelizeClient: SequelizeClient,
  newParticipant: Participant
): Promise<Participant> => {
  const participantModel = sequelizeClient.getParticipantModel();

  const model = await participantModel.create({
    id: newParticipant.id || v4(),
    firstName: newParticipant.firstName,
    lastName: newParticipant.lastName,
    email: newParticipant.email,
    phone: newParticipant.phone,
    publicKey: newParticipant.key.public,
  });

  const dbParticipant = model.get();

  return map(dbParticipant);
};
