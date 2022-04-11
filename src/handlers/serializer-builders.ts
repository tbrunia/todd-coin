import { Linker, Metaizer, Paginator, Relator, Serializer } from "ts-japi";
import { ApiSettings, Block, Node, Participant, Transaction } from "../types";
import _ from "lodash";
import {
  DEFAULT_PAGE_SIZE,
  FIRST_PAGE,
  MAX_TRANSACTIONS_PER_BLOCK,
} from "../constants";

export const buildBlockSerializer = (
  apiSettings: ApiSettings
): Serializer<Block> => {
  return new Serializer<Block>("block", {
    nullData: false,
    projection: {
      transactions: 0,
    },
    relators: [
      new Relator<Block, Transaction>(
        async (block: Block) => block.transactions,
        new Serializer<Transaction>("transactions", {
          onlyIdentifier: true,
        }),
        {
          linkers: {
            related: new Linker<[Block]>((block: Block) => {
              return `${apiSettings.apiBaseUrl}/blocks/${block.id}/transactions?page[number]=${FIRST_PAGE}&page[size]=${DEFAULT_PAGE_SIZE}`;
            }),
          },
        }
      ),
    ],
    linkers: {
      document: new Linker((block: Block) => {
        return `${apiSettings.apiBaseUrl}/blocks/${block.id}`;
      }),
      resource: new Linker((block: Block) => {
        return `${apiSettings.apiBaseUrl}/blocks/${block.id}`;
      }),
    },
  });
};

export const buildBlocksSerializer = (
  apiSettings: ApiSettings,
  count: number,
  pageNumber: number,
  pageSize: number
): Serializer<Block> => {
  const pages = Math.ceil(count / pageSize);

  return new Serializer<Block>("block", {
    nullData: false,
    projection: {
      transactions: 0,
    },
    relators: [
      new Relator<Block, Transaction>(
        async (block: Block) => _.first(_.chunk(block.transactions, 10)),
        new Serializer<Transaction>("transactions", {
          onlyIdentifier: true,
        }),
        {
          linkers: {
            related: new Linker<[Block]>((block: Block) => {
              return `${apiSettings.apiBaseUrl}/blocks/${block.id}/transactions?page[number]=${FIRST_PAGE}&page[size]=${MAX_TRANSACTIONS_PER_BLOCK}`;
            }),
          },
        }
      ),
    ],
    linkers: {
      document: new Linker(() => {
        return `${apiSettings.apiBaseUrl}/blocks?page[number]=${pageNumber}&page[size]=${pageSize}`;
      }),
      resource: new Linker((block: Block) => {
        return `${apiSettings.apiBaseUrl}/blocks/${block.id}`;
      }),
      paginator: new Paginator(() => {
        const nextPage = pageNumber + 1;
        const previousPage = pageNumber - 1;
        return {
          first: `${apiSettings.apiBaseUrl}/blocks?page[number]=${FIRST_PAGE}&page[size]=${pageSize}`,
          last: `${apiSettings.apiBaseUrl}/blocks?page[number]=${pages}&page[size]=${pageSize}`,
          next:
            nextPage <= pages
              ? `${apiSettings.apiBaseUrl}/blocks?page[number]=${nextPage}&page[size]=${pageSize}`
              : null,
          prev:
            previousPage >= 0
              ? `${apiSettings.apiBaseUrl}/blocks?page[number]=${previousPage}&page[size]=${pageSize}`
              : null,
        };
      }),
    },
    metaizers: {
      document: new Metaizer(() => ({
        itemsPerPage: pageSize,
        totalItems: count,
        currentPage: pageNumber,
        totalPages: pages,
      })),
    },
  });
};

export const buildPendingTransactionSerializer = (
  apiSettings: ApiSettings
): Serializer<Transaction> => {
  return new Serializer<Transaction>("pending-transaction", {
    nullData: false,
    linkers: {
      document: new Linker((pendingTransactions: Transaction) => {
        return `${apiSettings.apiBaseUrl}/pending-transactions/${pendingTransactions.id}`;
      }),
      resource: new Linker((pendingTransaction: Transaction) => {
        return `${apiSettings.apiBaseUrl}/pending-transactions/${pendingTransaction.id}`;
      }),
    },
  });
};

export const buildPendingTransactionsSerializer = (
  apiSettings: ApiSettings,
  count: number,
  pageNumber: number,
  pageSize: number
): Serializer<Transaction> => {
  const pages = Math.ceil(count / pageSize);

  return new Serializer<Transaction>("pending-transaction", {
    nullData: false,
    linkers: {
      document: new Linker(() => {
        return `${apiSettings.apiBaseUrl}/pending-transactions?page[number]=${pageNumber}&page[size]=${pageSize}`;
      }),
      resource: new Linker((pendingTransaction: Transaction) => {
        return `${apiSettings.apiBaseUrl}/pending-transactions/${pendingTransaction.id}`;
      }),
      paginator: new Paginator(() => {
        const nextPage = pageNumber + 1;
        const previousPage = pageNumber - 1;
        return {
          first: `${apiSettings.apiBaseUrl}/pending-transactions?page[number]=${FIRST_PAGE}&page[size]=${pageSize}`,
          last: `${apiSettings.apiBaseUrl}/pending-transactions?page[number]=${pages}&page[size]=${pageSize}`,
          next:
            nextPage <= pages
              ? `${apiSettings.apiBaseUrl}/pending-transactions?page[number]=${nextPage}&page[size]=${pageSize}`
              : null,
          prev:
            previousPage >= 0
              ? `${apiSettings.apiBaseUrl}/pending-transactions?page[number]=${previousPage}&page[size]=${pageSize}`
              : null,
        };
      }),
    },
    metaizers: {
      document: new Metaizer(() => ({
        itemsPerPage: pageSize,
        totalItems: count,
        currentPage: pageNumber,
        totalPages: pages,
      })),
    },
  });
};

export const buildSignedTransactionSerializer = (
  apiSettings: ApiSettings
): Serializer<Transaction> => {
  return new Serializer<Transaction>("signed-transaction", {
    nullData: false,
    linkers: {
      document: new Linker((signedTransactions: Transaction) => {
        return `${apiSettings.apiBaseUrl}/signed-transactions/${signedTransactions.id}`;
      }),
      resource: new Linker((signedTransaction: Transaction) => {
        return `${apiSettings.apiBaseUrl}/signed-transactions/${signedTransaction.id}`;
      }),
    },
  });
};

export const buildSignedTransactionsSerializer = (
  apiSettings: ApiSettings,
  count: number,
  pageNumber: number,
  pageSize: number
): Serializer<Transaction> => {
  const pages = Math.ceil(count / pageSize);

  return new Serializer<Transaction>("signed-transaction", {
    nullData: false,
    linkers: {
      document: new Linker(() => {
        return `${apiSettings.apiBaseUrl}/signed-transactions?page[number]=${pageNumber}&page[size]=${pageSize}`;
      }),
      resource: new Linker((signedTransaction: Transaction) => {
        return `${apiSettings.apiBaseUrl}/signed-transactions/${signedTransaction.id}`;
      }),
      paginator: new Paginator(() => {
        const nextPage = pageNumber + 1;
        const previousPage = pageNumber - 1;
        return {
          first: `${apiSettings.apiBaseUrl}/signed-transactions?page[number]=${FIRST_PAGE}&page[size]=${pageSize}`,
          last: `${apiSettings.apiBaseUrl}/signed-transactions?page[number]=${pages}&page[size]=${pageSize}`,
          next:
            nextPage <= pages
              ? `${apiSettings.apiBaseUrl}/signed-transactions?page[number]=${nextPage}&page[size]=${pageSize}`
              : null,
          prev:
            previousPage >= 0
              ? `${apiSettings.apiBaseUrl}/signed-transactions?page[number]=${previousPage}&page[size]=${pageSize}`
              : null,
        };
      }),
    },
    metaizers: {
      document: new Metaizer(() => ({
        itemsPerPage: pageSize,
        totalItems: count,
        currentPage: pageNumber,
        totalPages: pages,
      })),
    },
  });
};

export const buildBlockTransactionSerializer = (
  apiSettings: ApiSettings,
  block: Block
): Serializer<Transaction> => {
  return new Serializer<Transaction>("transaction", {
    nullData: false,
    relators: [
      new Relator<Transaction, Block>(
        async () => block,
        new Serializer<Block>("block", {
          onlyIdentifier: true,
        }),
        {
          linkers: {
            related: new Linker(() => {
              return `${apiSettings.apiBaseUrl}/blocks/${block.id}`;
            }),
          },
        }
      ),
    ],
    linkers: {
      document: new Linker((transactions: Transaction) => {
        return `${apiSettings.apiBaseUrl}/blocks/${block.id}/transactions/${transactions.id}`;
      }),
      resource: new Linker((transaction: Transaction) => {
        return `${apiSettings.apiBaseUrl}/blocks/${block.id}/transactions/${transaction.id}`;
      }),
    },
  });
};

export const buildBlockTransactionsSerializer = (
  apiSettings: ApiSettings,
  block: Block,
  count: number,
  pageNumber: number,
  pageSize: number
): Serializer<Transaction> => {
  const pages = Math.ceil(count / pageSize);

  return new Serializer<Transaction>("transaction", {
    nullData: false,
    relators: [
      new Relator<Transaction, Block>(
        async () => block,
        new Serializer<Block>("block", {
          onlyIdentifier: true,
        }),
        {
          linkers: {
            related: new Linker(() => {
              return `${apiSettings.apiBaseUrl}/blocks/${block.id}`;
            }),
          },
        }
      ),
    ],
    linkers: {
      document: new Linker(() => {
        return `${apiSettings.apiBaseUrl}/blocks/${block.id}/transactions?page[number]=${pageNumber}&page[size]=${pageSize}`;
      }),
      resource: new Linker((transaction: Transaction) => {
        return `${apiSettings.apiBaseUrl}/blocks/${block.id}/transactions/${transaction.id}`;
      }),
      paginator: new Paginator(() => {
        const nextPage = pageNumber + 1;
        const previousPage = pageNumber - 1;
        return {
          first: `${apiSettings.apiBaseUrl}/blocks/${block.id}/transactions?page[number]=${FIRST_PAGE}&page[size]=${pageSize}`,
          last: `${apiSettings.apiBaseUrl}/blocks/${block.id}/transactions?page[number]=${pages}&page[size]=${pageSize}`,
          next:
            nextPage <= pages
              ? `${apiSettings.apiBaseUrl}/blocks/${block.id}/transactions?page[number]=${nextPage}&page[size]=${pageSize}`
              : null,
          prev:
            previousPage >= 0
              ? `${apiSettings.apiBaseUrl}/blocks/${block.id}/transactions?page[number]=${previousPage}&page[size]=${pageSize}`
              : null,
        };
      }),
    },
    metaizers: {
      document: new Metaizer(() => ({
        itemsPerPage: pageSize,
        totalItems: count,
        currentPage: pageNumber,
        totalPages: pages,
      })),
    },
  });
};

export const buildParticipantSerializer = (
  apiSettings: ApiSettings
): Serializer<Participant> => {
  return new Serializer<Participant>("participant", {
    nullData: false,
    linkers: {
      document: new Linker((participants: Participant) => {
        return `${apiSettings.apiBaseUrl}/participants/${participants.id}`;
      }),
      resource: new Linker((pendingTransaction: Participant) => {
        return `${apiSettings.apiBaseUrl}/participants/${pendingTransaction.id}`;
      }),
    },
  });
};

export const buildParticipantsSerializer = (
  apiSettings: ApiSettings,
  count: number,
  pageNumber: number,
  pageSize: number
): Serializer<Participant> => {
  const pages = Math.ceil(count / pageSize);

  return new Serializer<Participant>("participant", {
    nullData: false,
    linkers: {
      document: new Linker(() => {
        return `${apiSettings.apiBaseUrl}/participants?page[number]=${pageNumber}&page[size]=${pageSize}`;
      }),
      resource: new Linker((pendingTransaction: Participant) => {
        return `${apiSettings.apiBaseUrl}/participants/${pendingTransaction.id}`;
      }),
      paginator: new Paginator(() => {
        const nextPage = pageNumber + 1;
        const previousPage = pageNumber - 1;
        return {
          first: `${apiSettings.apiBaseUrl}/participants?page[number]=${FIRST_PAGE}&page[size]=${pageSize}`,
          last: `${apiSettings.apiBaseUrl}/participants?page[number]=${pages}&page[size]=${pageSize}`,
          next:
            nextPage <= pages
              ? `${apiSettings.apiBaseUrl}/participants?page[number]=${nextPage}&page[size]=${pageSize}`
              : null,
          prev:
            previousPage >= 0
              ? `${apiSettings.apiBaseUrl}/participants?page[number]=${previousPage}&page[size]=${pageSize}`
              : null,
        };
      }),
    },
    metaizers: {
      document: new Metaizer(() => ({
        itemsPerPage: pageSize,
        totalItems: count,
        currentPage: pageNumber,
        totalPages: pages,
      })),
    },
  });
};

export const buildNodeSerializer = (
  apiSettings: ApiSettings
): Serializer<Node> => {
  return new Serializer<Node>("node", {
    nullData: false,
    linkers: {
      document: new Linker((nodes: Node) => {
        return `${apiSettings.apiBaseUrl}/nodes/${nodes.id}`;
      }),
      resource: new Linker((pendingTransaction: Node) => {
        return `${apiSettings.apiBaseUrl}/nodes/${pendingTransaction.id}`;
      }),
    },
  });
};

export const buildNodesSerializer = (
  apiSettings: ApiSettings,
  count: number,
  pageNumber: number,
  pageSize: number
): Serializer<Node> => {
  const pages = Math.ceil(count / pageSize);

  return new Serializer<Node>("node", {
    nullData: false,
    linkers: {
      document: new Linker(() => {
        return `${apiSettings.apiBaseUrl}/nodes?page[number]=${pageNumber}&page[size]=${pageSize}`;
      }),
      resource: new Linker((pendingTransaction: Node) => {
        return `${apiSettings.apiBaseUrl}/nodes/${pendingTransaction.id}`;
      }),
      paginator: new Paginator(() => {
        const nextPage = pageNumber + 1;
        const previousPage = pageNumber - 1;
        return {
          first: `${apiSettings.apiBaseUrl}/nodes?page[number]=${FIRST_PAGE}&page[size]=${pageSize}`,
          last: `${apiSettings.apiBaseUrl}/nodes?page[number]=${pages}&page[size]=${pageSize}`,
          next:
            nextPage <= pages
              ? `${apiSettings.apiBaseUrl}/nodes?page[number]=${nextPage}&page[size]=${pageSize}`
              : null,
          prev:
            previousPage >= 0
              ? `${apiSettings.apiBaseUrl}/nodes?page[number]=${previousPage}&page[size]=${pageSize}`
              : null,
        };
      }),
    },
    metaizers: {
      document: new Metaizer(() => ({
        itemsPerPage: pageSize,
        totalItems: count,
        currentPage: pageNumber,
        totalPages: pages,
      })),
    },
  });
};
