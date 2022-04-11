import { Request, ResponseToolkit } from "@hapi/hapi";
import * as Boom from "@hapi/boom";
import { ValidationError, ValidationErrorItem } from "joi";
import {
  buildInternalServerError,
  buildInvalidAttributeError,
  buildInvalidParameterError,
  buildInvalidQueryError,
  buildNofFountError,
} from "./error-utils";
import { SequelizeClient } from "../brokers/sequelize-client";
import { DEFAULT_PAGE_SIZE, FIRST_PAGE } from "../constants";
import { ApiData, ApiSettings, Transaction } from "../types";
import {
  createPendingTransaction,
  getPendingTransactionById,
  getPendingTransactions,
} from "../brokers/transactions-broker";
import {
  buildPendingTransactionSerializer,
  buildPendingTransactionsSerializer,
} from "./serializer-builders";

export const getPendingTransactionsValidationFailAction = (
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

export const getPendingTransactionsRequestHandler =
  (sequelizeClient: SequelizeClient, apiSettings: ApiSettings) =>
  async (request: Request, h: ResponseToolkit) => {
    const pageNumber: number =
      Number(request.query["page[number]"]) || FIRST_PAGE;

    const pageSize: number =
      Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

    const fromFilter: string = request.query["filter[from]"];

    const toFilter: string = request.query["filter[to]"];

    let response: { count: number; rows: Transaction[] };
    try {
      response = await getPendingTransactions(
        sequelizeClient,
        pageNumber,
        pageSize,
        fromFilter,
        toFilter
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

    return await buildPendingTransactionsSerializer(
      apiSettings,
      count,
      pageNumber,
      pageSize
    ).serialize(rows);
  };

export const getPendingTransactionValidationFailAction = (
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

export const getPendingTransactionRequestHandler =
  (sequelizeClient: SequelizeClient, apiSettings: ApiSettings) =>
  async (request: Request, h: ResponseToolkit) => {
    const { pendingTransactionId } = request.params;

    let pendingTransaction: Transaction;
    try {
      pendingTransaction = await getPendingTransactionById(
        sequelizeClient,
        pendingTransactionId
      );
    } catch (error) {
      console.error(error.message);
      return h
        .response({
          errors: [buildInternalServerError()],
        })
        .code(500);
    }

    if (pendingTransaction === undefined) {
      return h
        .response({
          errors: [
            buildNofFountError(
              `A pending transaction with id: ${pendingTransactionId} was not found.`
            ),
          ],
        })
        .code(404);
    }

    return buildPendingTransactionSerializer(apiSettings).serialize(
      pendingTransaction
    );
  };

export const postPendingTransactionValidationFailAction = (
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

export const postPendingTransactionRequestHandler =
  (sequelizeClient: SequelizeClient, apiSettings: ApiSettings) =>
  async (request: Request, h: ResponseToolkit) => {
    const payload = request.payload as { data: ApiData<Transaction> };

    const newPendingTransaction = {
      id: payload.data.id,
      ...payload.data.attributes,
    } as Transaction;

    // todo - check for duplicate pending transactions (rules?)

    try {
      const createdPendingTransaction: Transaction =
        await createPendingTransaction(sequelizeClient, newPendingTransaction);

      return buildPendingTransactionSerializer(apiSettings).serialize(
        createdPendingTransaction
      );
    } catch (error) {
      console.error(error.message);
      return h
        .response({
          errors: [buildInternalServerError()],
        })
        .code(500);
    }
  };
