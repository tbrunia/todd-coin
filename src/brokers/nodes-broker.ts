import { Node } from "../types";
import { SequelizeClient } from "./sequelize-client";
import { v4 } from "uuid";

const map = (dbNode): Node => ({
  id: dbNode.id,
  createdAt: dbNode.createdAt,
  updatedAt: dbNode.updatedAt,
  baseUrl: dbNode.baseUrl,
});

export const getNodeById = async (
  sequelizeClient: SequelizeClient,
  id: string
): Promise<Node | undefined> => {
  const nodeModel = sequelizeClient.getNodeModel();

  const model = await nodeModel.findByPk(id);

  if (!model) {
    return;
  }

  const dbNode = model.get();

  return map(dbNode);
};

export const getNodes = async (
  sequelizeClient: SequelizeClient
): Promise<Node[]> => {
  const nodeModel = sequelizeClient.getNodeModel();

  const models = await nodeModel.findAll();

  return models.map((model) => {
    const dbNode = model.get();

    return map(dbNode);
  });
};

export const createNode = async (
  sequelizeClient: SequelizeClient,
  newNode: Node
): Promise<Node> => {
  const nodeModel = sequelizeClient.getNodeModel();

  const model = await nodeModel.create({
    id: newNode.id || v4(),
    baseUrl: newNode.baseUrl,
  });

  const dbNode = model.get();

  return map(dbNode);
};
