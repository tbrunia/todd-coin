import { Request, ResponseToolkit } from "@hapi/hapi";
import { DEFAULT_PAGE_SIZE, FIRST_PAGE } from "../constants";
import {
  ApiData,
  ApiSettings,
  Block,
  Participant,
  Transaction,
} from "../types";
import {
  buildBlockSerializer,
  buildBlocksSerializer,
} from "./serializer-builders";
import { createBlock, getBlockById, getBlocks } from "../brokers/blocks-broker";
import { SequelizeClient } from "../brokers/sequelize-client";
import {
  buildInternalServerError,
  buildInvalidAttributeError,
  buildInvalidParameterError,
  buildInvalidQueryError,
  buildNofFountError,
} from "./error-utils";
import * as Boom from "@hapi/boom";
import { ValidationError, ValidationErrorItem } from "joi";

export const getBlocksValidationFailAction = (
  request: Request,
  h: ResponseToolkit,
  error: (Boom.Boom & ValidationError) | undefined
) => {
  return h
    .response({
      errors: error.details.map((errorItem: ValidationErrorItem) =>
        buildInvalidQueryError(errorItem)
      ),
    })
    .code(error.output.statusCode)
    .takeover();
};

export const getBlocksRequestHandler =
  (sequelizeClient: SequelizeClient, apiSettings: ApiSettings) =>
  async (request: Request, h: ResponseToolkit) => {
    const pageNumber: number =
      Number(request.query["page[number]"]) || FIRST_PAGE;

    const pageSize: number =
      Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

    let response: { count: number; rows: Block[] };

    try {
      response = await getBlocks(sequelizeClient, pageNumber, pageSize);
    } catch (error) {
      console.error(error.message);
      return h
        .response({
          errors: [buildInternalServerError()],
        })
        .code(500);
    }

    const { count, rows } = response;

    return await buildBlocksSerializer(
      apiSettings,
      count,
      pageNumber,
      pageSize
    ).serialize(rows);
  };

export const getBlockValidationFailAction = (
  request: Request,
  h: ResponseToolkit,
  error: (Boom.Boom & ValidationError) | undefined
) => {
  return h
    .response({
      errors: error.details.map((errorItem: ValidationErrorItem) =>
        buildInvalidParameterError(errorItem)
      ),
    })
    .code(error.output.statusCode)
    .takeover();
};

export const getBlockRequestHandler =
  (sequelizeClient: SequelizeClient, apiSettings: ApiSettings) =>
  async (request: Request, h: ResponseToolkit) => {
    const { blockId } = request.params;

    let block: Block;
    try {
      block = await getBlockById(sequelizeClient, blockId);
    } catch (error) {
      console.error(error);
      return h
        .response({
          errors: [buildInternalServerError()],
        })
        .code(500);
    }

    if (block === undefined) {
      return h
        .response({
          errors: [
            buildNofFountError(`A block with id: ${blockId} was not found.`),
          ],
        })
        .code(404);
    }

    return await buildBlockSerializer(apiSettings).serialize(block);
  };

export const postBlockValidationFailAction = (
  request: Request,
  h: ResponseToolkit,
  error: (Boom.Boom & ValidationError) | undefined
) => {
  return h
    .response({
      errors: error.details.map((errorItem: ValidationErrorItem) =>
        buildInvalidAttributeError(errorItem)
      ),
    })
    .code(error.output.statusCode)
    .takeover();
};

export const postBlockRequestHandler =
  (sequelizeClient: SequelizeClient, apiSettings: ApiSettings) =>
  async (request: Request, h: ResponseToolkit) => {
    const payload = request.payload as {
      data: {
        id: string;
        attributes: Record<string, string | number | boolean | object>;
        relationships: {
          transactions: Array<{ data: ApiData<Transaction> }>;
        };
      };
    };

    const participant = request.auth.credentials.participant as Participant;

    const minerPublicKey = participant.key.public;

    const newBlock = {
      id: payload.data.id,
      ...payload.data.attributes,
      transactions: payload.data.relationships.transactions.map(
        (transactionData: { data: ApiData<Transaction> }) => ({
          id: transactionData.data.id,
          ...transactionData.data.attributes,
        })
      ),
    } as Block;

    // todo - validate that the new block can be added to the chain. return bad request if not

    let createdBlock: Block;
    try {
      createdBlock = await createBlock(
        sequelizeClient,
        newBlock,
        minerPublicKey
      );
    } catch (error) {
      console.error(error.message);
      return h
        .response({
          errors: [buildInternalServerError()],
        })
        .code(500);
    }

    // todo - notify known blocks that a new block was added

    return buildBlockSerializer(apiSettings).serialize(createdBlock);
  };
