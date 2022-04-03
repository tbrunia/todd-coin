import { Participant } from "../types";
import { SequelizeClient } from "./sequelize-client";
import { Model } from "sequelize";
import { v4 } from "uuid";

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

export const getParticipants = async (
  sequelizeClient: SequelizeClient
): Promise<Participant[]> => {
  const participantModel = sequelizeClient.getParticipantModel();

  const models = await participantModel.findAll();

  return models.map((model: Model) => {
    const dbParticipant = model.get();

    return map(dbParticipant);
  });
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
