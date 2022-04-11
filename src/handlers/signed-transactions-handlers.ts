import { SequelizeClient } from "../brokers/sequelize-client";
import { Request, ResponseToolkit } from "@hapi/hapi";
import * as Boom from "@hapi/boom";
import { ValidationError, ValidationErrorItem } from "joi";
import { DEFAULT_PAGE_SIZE, FIRST_PAGE } from "../constants";
import { ApiData, ApiSettings, Transaction } from "../types";
import {
  createSignedTransaction,
  getSignedTransactionById,
  getSignedTransactions,
} from "../brokers/transactions-broker";
import {
  buildSignedTransactionSerializer,
  buildSignedTransactionsSerializer,
} from "./serializer-builders";
import {
  buildInternalServerError,
  buildInvalidAttributeError,
  buildInvalidParameterError,
  buildInvalidQueryError,
  buildNofFountError,
} from "./error-utils";

export const getSignedTransactionsValidationFailAction = (
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

export const getSignedTransactionsRequestHandler =
  (sequelizeClient: SequelizeClient, apiSettings: ApiSettings) =>
  async (request: Request, h: ResponseToolkit) => {
    const pageNumber: number =
      Number(request.query["page[number]"]) || FIRST_PAGE;

    const pageSize: number =
      Number(request.query["page[size]"]) || DEFAULT_PAGE_SIZE;

    let response: { count: number; rows: Transaction[] };
    try {
      response = await getSignedTransactions(
        sequelizeClient,
        pageNumber,
        pageSize
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

    return await buildSignedTransactionsSerializer(
      apiSettings,
      count,
      pageNumber,
      pageSize
    ).serialize(rows);
  };

export const getSignedTransactionValidationFailAction = (
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

export const getSignedTransactionRequestHandler =
  (sequelizeClient: SequelizeClient, apiSettings: ApiSettings) =>
  async (request: Request, h: ResponseToolkit) => {
    const { signedTransactionId } = request.params;

    let signedTransaction: Transaction;
    try {
      signedTransaction = await getSignedTransactionById(
        sequelizeClient,
        signedTransactionId
      );
    } catch (error) {
      console.error(error.message);
      return h
        .response({
          errors: [buildInternalServerError()],
        })
        .code(500);
    }

    if (signedTransaction === undefined) {
      return h
        .response({
          errors: [
            buildNofFountError(
              `A signed transaction with id: ${signedTransactionId} was not found.`
            ),
          ],
        })
        .code(404);
    }

    return buildSignedTransactionSerializer(apiSettings).serialize(
      signedTransaction
    );
  };

export const postSignedTransactionValidationFailAction = (
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

export const postSignedTransactionRequestHandler =
  (sequelizeClient: SequelizeClient, apiSettings: ApiSettings) =>
  async (request: Request, h: ResponseToolkit) => {
    const payload = request.payload as { data: ApiData<Transaction> };

    const newSignedTransaction = {
      id: payload.data.id,
      ...payload.data.attributes,
    } as Transaction;

    let createdSignedTransaction: Transaction;
    try {
      createdSignedTransaction = await createSignedTransaction(
        sequelizeClient,
        newSignedTransaction
      );
    } catch (error) {
      console.error(error.message);
      return h
        .response({
          errors: [buildInternalServerError()],
        })
        .code(500);
    }

    // todo - when the number of signed transactions reaches a threshold, automatically mine a new block

    return buildSignedTransactionSerializer(apiSettings).serialize(
      createdSignedTransaction
    );
  };
