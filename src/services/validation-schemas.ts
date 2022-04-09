import Joi from "joi";
import {MAX_TRANSACTIONS_PER_BLOCK, MAXIMUM_PAGE_SIZE} from "../constants";

const HASH_REGEX = /^([a-z0-9]){64}$/;
const PRIVATE_KEY_REGEX = /^([a-z0-9]){64}$/;
const PUBLIC_KEY_REGEX = /^([a-z0-9]){130}$/;
const SIGNATURE_REGEX = /^([a-z0-9]){142}$/;

export const AUTH_SCHEMA = Joi.object({
  privateKey: Joi.string()
    .pattern(PRIVATE_KEY_REGEX)
    .required()
    .label("Private Key"),
}).unknown(false);

const BASE_TRANSACTION = Joi.object({
  from: Joi.string().pattern(PUBLIC_KEY_REGEX).required().label("From"),
  to: Joi.string().pattern(PUBLIC_KEY_REGEX).required().label("To"),
  amount: Joi.number()
    .integer()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER)
    .required()
    .label("Amount"),
  description: Joi.string().min(1).max(512).label("Description"),
});

export const BLOCK_ID_SCHEMA = Joi.string().guid().label("Block ID");

export const PENDING_TRANSACTION_ID_SCHEMA = Joi.string().guid().label("Pending Transaction ID");

export const SIGNED_TRANSACTION_ID_SCHEMA = Joi.string().guid().label("Signed Transaction ID");

export const BLOCK_TRANSACTION_ID_SCHEMA = Joi.string().guid().label("Block Transaction ID");

export const PARTICIPANT_ID_SCHEMA = Joi.string().guid().label("Participant ID");

export const NODE_ID_SCHEMA = Joi.string().guid().label("Node ID");

export const PAGE_NUMBER_SCHEMA = Joi.number().min(0).max(Number.MAX_SAFE_INTEGER).label("Page Number");

export const PAGE_SIZE_SCHEMA = Joi.number().min(1).max(MAXIMUM_PAGE_SIZE).label("Page Number");

export const FROM_SCHEMA = Joi.string().regex(PUBLIC_KEY_REGEX).label("From");

export const TO_SCHEMA = Joi.string().regex(PUBLIC_KEY_REGEX).label("To");

export const PUBLIC_KEY_SCHEMA = Joi.string().regex(PUBLIC_KEY_REGEX).label("Public Key");

export const PENDING_TRANSACTION_SCHEMA = Joi.object({
  data: Joi.object({
    attributes: BASE_TRANSACTION.unknown(false).required().label("Attributes"),
  })
    .unknown(false)
    .required()
    .label("Data"),
}).unknown(false);

export const SIGNED_TRANSACTION_SCHEMA = Joi.object({
  data: Joi.object({
    id: Joi.string().guid().required().label("ID"),
    attributes: BASE_TRANSACTION.keys({
      signature: Joi.string()
          .pattern(SIGNATURE_REGEX)
          .required()
          .label("Signature"),
    }).unknown(false).required().label("Attributes"),
  })
      .unknown(false)
      .required()
      .label("Data"),
}).unknown(false);

export const BLOCK_SCHEMA = Joi.object({
  data: Joi.object({
    id: Joi.string().guid().required().label("ID"),
    attributes: Joi.object({
      nonce: Joi.number()
        .integer()
        .min(0)
        .max(Number.MAX_SAFE_INTEGER)
        .required()
        .label("Nonce"),
      previousHash: Joi.string()
        .pattern(HASH_REGEX)
        .required()
        .label("Previous Hash"),
      hash: Joi.string().pattern(HASH_REGEX).required().label("Hash"),
    })
      .unknown(false)
      .required()
      .label("Attributes"),
    relationships: Joi.object({
      transactions: Joi.array()
        .items(SIGNED_TRANSACTION_SCHEMA)
        .min(1)
        .max(MAX_TRANSACTIONS_PER_BLOCK)
        .required()
        .label("Transactions"),
    })
      .unknown(false)
      .required()
      .label("Relationships"),
  })
    .unknown(false)
    .required()
    .label("Data"),
}).unknown(false);

export const PARTICIPANT_SCHEMA = Joi.object({
  data: Joi.object({
    attributes: Joi.object({
      firstName: Joi.string().min(3).max(100).label("First Name"),
      lastName: Joi.string().min(3).max(100).label("Last Name"),
      email: Joi.string().email().label("Email"),
      phone: Joi.string()
        .pattern(/^\(\d{3}\)\s\d{3}-\d{4}$/)
        .label("Phone"),
      roles: Joi.array()
        .items(
          Joi.string()
            .valid("VOLUNTEER", "CHARITY", "NODE")
            .min(1)
            .required()
            .label("Role Types")
        )
        .required()
        .label("Roles"),
    })
      .unknown(false)
      .required()
      .label("Attributes"),
  })
    .unknown(false)
    .required()
    .label("Data"),
}).unknown(false);

export const NODE_SCHEMA = Joi.object({
  data: Joi.object({
    attributes: Joi.object({
      baseUrl: Joi.string().uri().required().label("Base Url"),
    })
      .unknown(false)
      .required()
      .label("Attributes"),
  })
    .unknown(false)
    .required()
    .label("Data"),
}).unknown(false);
