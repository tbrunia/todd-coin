import { SequelizeClient } from "../brokers/sequelize-client";
import { Request, ResponseToolkit } from "@hapi/hapi";
import * as Boom from "@hapi/boom";
import { ValidationError, ValidationErrorItem } from "joi";
import { DEFAULT_PAGE_SIZE, FIRST_PAGE } from "../constants";
import { ApiSettings, Block, Transaction } from "../types";
import { getBlockById } from "../brokers/blocks-broker";
import {
  getBlockTransactionById,
  getBlockTransactions,
} from "../brokers/transactions-broker";
import {
  buildBlockTransactionSerializer,
  buildBlockTransactionsSerializer,
} from "./serializer-builders";
import {
  buildInternalServerError,
  buildInvalidParameterError,
  buildInvalidQueryError,
  buildNofFountError,
} from "./error-utils";

export const getBlockTransactionsValidationFailAction = (
  request: Request,
  h: ResponseToolkit,
  error: (Boom.Boom & ValidationError) | undefined
) => {
  return h
    .response({
      errors: error.details.map((errorItem: ValidationErrorItem) => {
        if (errorItem.context.key === "blockId") {
          return buildInvalidParameterError(errorItem);
        }
        return buildInvalidQueryError(errorItem);
      }),
    })
    .code(error.output.statusCode)
    .takeover();
};

export const getBlockTransactionsRequestHandler =
  (sequelizeClient: SequelizeClient, apiSettings: ApiSettings) =>
  async (request: Request, h: ResponseToolkit) => {
    const { blockId } = request.params;

    const pageNumber: number =
      Number(request.query["page[number]"]) || FIRST_PAGE;

    const pageSize: number =
      Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

    let block: Block;

    try {
      block = await getBlockById(sequelizeClient, blockId);
    } catch (error) {
      console.error(error.message);
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

    let response: { count: number; rows: Transaction[] };
    try {
      response = await getBlockTransactions(
        sequelizeClient,
        pageNumber,
        pageSize,
        blockId
      );
    } catch (error) {
      console.error(error.message);
      return h
        .response({
          errors: [buildInternalServerError()],
        })
        .code(500);
    }

    const { count, rows } = response;

    return await buildBlockTransactionsSerializer(
      apiSettings,
      block,
      count,
      pageNumber,
      pageSize
    ).serialize(rows);
  };

export const getBlockTransactionValidationFailAction = (
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

export const getBlockTransactionRequestHandler =
  (sequelizeClient: SequelizeClient, apiSettings: ApiSettings) =>
  async (request: Request, h: ResponseToolkit) => {
    const { blockId, blockTransactionId } = request.params;

    let block: Block;

    try {
      block = await getBlockById(sequelizeClient, blockId);
    } catch (error) {
      console.error(error.message);
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

    let blockTransaction: Transaction;
    try {
      blockTransaction = await getBlockTransactionById(
        sequelizeClient,
        blockId,
        blockTransactionId
      );
    } catch (error) {
      console.error(error.message);
      return h
        .response({
          errors: [buildInternalServerError()],
        })
        .code(500);
    }

    if (blockTransaction === undefined) {
      return h
        .response({
          errors: [
            buildNofFountError(
              `A block transaction with id: ${blockTransactionId} was not found.`
            ),
          ],
        })
        .code(404);
    }

    return buildBlockTransactionSerializer(apiSettings, block).serialize(
      blockTransaction
    );
  };
