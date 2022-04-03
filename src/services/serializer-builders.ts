import { Linker, Metaizer, Paginator, Relator, Serializer } from "ts-japi";
import { Block, Node, Participant, Transaction } from "../types";
import _ from "lodash";
import {
  DEFAULT_PAGE_SIZE,
  FIRST_PAGE,
  HOST,
  MAX_TRANSACTIONS_PER_BLOCK,
  PORT,
  PROTOCOL,
} from "../constants";

export const buildBlockSerializer = (): Serializer<Block> => {
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
              return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions?page[number]=${FIRST_PAGE}&page[size]=${DEFAULT_PAGE_SIZE}`;
            }),
          },
        }
      ),
    ],
    linkers: {
      document: new Linker((block: Block) => {
        return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}`;
      }),
      resource: new Linker((block: Block) => {
        return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}`;
      }),
    },
  });
};

export const buildBlocksSerializer = (
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
              return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions?page[number]=${FIRST_PAGE}&page[size]=${MAX_TRANSACTIONS_PER_BLOCK}`;
            }),
          },
        }
      ),
    ],
    linkers: {
      document: new Linker(() => {
        return `${PROTOCOL}://${HOST}:${PORT}/blocks?page[number]=${pageNumber}&page[size]=${pageSize}`;
      }),
      resource: new Linker((block: Block) => {
        return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}`;
      }),
      paginator: new Paginator(() => {
        const nextPage = pageNumber + 1;
        const previousPage = pageNumber - 1;
        return {
          first: `${PROTOCOL}://${HOST}:${PORT}/blocks?page[number]=${FIRST_PAGE}&page[size]=${pageSize}`,
          last: `${PROTOCOL}://${HOST}:${PORT}/blocks?page[number]=${pages}&page[size]=${pageSize}`,
          next:
            nextPage <= pages
              ? `${PROTOCOL}://${HOST}:${PORT}/blocks?page[number]=${nextPage}&page[size]=${pageSize}`
              : null,
          prev:
            previousPage >= 0
              ? `${PROTOCOL}://${HOST}:${PORT}/blocks?page[number]=${previousPage}&page[size]=${pageSize}`
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

export const buildPendingTransactionSerializer =
  (): Serializer<Transaction> => {
    return new Serializer<Transaction>("pending-transaction", {
      nullData: false,
      linkers: {
        document: new Linker((pendingTransactions: Transaction) => {
          return `${PROTOCOL}://${HOST}:${PORT}/pending-transactions/${pendingTransactions.id}`;
        }),
        resource: new Linker((pendingTransaction: Transaction) => {
          return `${PROTOCOL}://${HOST}:${PORT}/pending-transactions/${pendingTransaction.id}`;
        }),
      },
    });
  };

export const buildPendingTransactionsSerializer = (
  count: number,
  pageNumber: number,
  pageSize: number
): Serializer<Transaction> => {
  const pages = Math.ceil(count / pageSize);

  return new Serializer<Transaction>("pending-transaction", {
    nullData: false,
    linkers: {
      document: new Linker(() => {
        return `${PROTOCOL}://${HOST}:${PORT}/pending-transactions?page[number]=${pageNumber}&page[size]=${pageSize}`;
      }),
      resource: new Linker((pendingTransaction: Transaction) => {
        return `${PROTOCOL}://${HOST}:${PORT}/pending-transactions/${pendingTransaction.id}`;
      }),
      paginator: new Paginator(() => {
        const nextPage = pageNumber + 1;
        const previousPage = pageNumber - 1;
        return {
          first: `${PROTOCOL}://${HOST}:${PORT}/pending-transactions?page[number]=${FIRST_PAGE}&page[size]=${pageSize}`,
          last: `${PROTOCOL}://${HOST}:${PORT}/pending-transactions?page[number]=${pages}&page[size]=${pageSize}`,
          next:
            nextPage <= pages
              ? `${PROTOCOL}://${HOST}:${PORT}/pending-transactions?page[number]=${nextPage}&page[size]=${pageSize}`
              : null,
          prev:
            previousPage >= 0
              ? `${PROTOCOL}://${HOST}:${PORT}/pending-transactions?page[number]=${previousPage}&page[size]=${pageSize}`
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

export const buildSignedTransactionSerializer = (): Serializer<Transaction> => {
  return new Serializer<Transaction>("signed-transaction", {
    nullData: false,
    linkers: {
      document: new Linker((signedTransactions: Transaction) => {
        return `${PROTOCOL}://${HOST}:${PORT}/signed-transactions/${signedTransactions.id}`;
      }),
      resource: new Linker((signedTransaction: Transaction) => {
        return `${PROTOCOL}://${HOST}:${PORT}/signed-transactions/${signedTransaction.id}`;
      }),
    },
  });
};

export const buildSignedTransactionsSerializer = (
  count: number,
  pageNumber: number,
  pageSize: number
): Serializer<Transaction> => {
  const pages = Math.ceil(count / pageSize);

  return new Serializer<Transaction>("signed-transaction", {
    nullData: false,
    linkers: {
      document: new Linker(() => {
        return `${PROTOCOL}://${HOST}:${PORT}/signed-transactions?page[number]=${pageNumber}&page[size]=${pageSize}`;
      }),
      resource: new Linker((signedTransaction: Transaction) => {
        return `${PROTOCOL}://${HOST}:${PORT}/signed-transactions/${signedTransaction.id}`;
      }),
      paginator: new Paginator(() => {
        const nextPage = pageNumber + 1;
        const previousPage = pageNumber - 1;
        return {
          first: `${PROTOCOL}://${HOST}:${PORT}/signed-transactions?page[number]=${FIRST_PAGE}&page[size]=${pageSize}`,
          last: `${PROTOCOL}://${HOST}:${PORT}/signed-transactions?page[number]=${pages}&page[size]=${pageSize}`,
          next:
            nextPage <= pages
              ? `${PROTOCOL}://${HOST}:${PORT}/signed-transactions?page[number]=${nextPage}&page[size]=${pageSize}`
              : null,
          prev:
            previousPage >= 0
              ? `${PROTOCOL}://${HOST}:${PORT}/signed-transactions?page[number]=${previousPage}&page[size]=${pageSize}`
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
              return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}`;
            }),
          },
        }
      ),
    ],
    linkers: {
      document: new Linker((transactions: Transaction) => {
        return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions/${transactions.id}`;
      }),
      resource: new Linker((transaction: Transaction) => {
        return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions/${transaction.id}`;
      }),
    },
  });
};

export const buildBlockTransactionsSerializer = (
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
              return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}`;
            }),
          },
        }
      ),
    ],
    linkers: {
      document: new Linker(() => {
        return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions?page[number]=${pageNumber}&page[size]=${pageSize}`;
      }),
      resource: new Linker((transaction: Transaction) => {
        return `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions/${transaction.id}`;
      }),
      paginator: new Paginator(() => {
        const nextPage = pageNumber + 1;
        const previousPage = pageNumber - 1;
        return {
          first: `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions?page[number]=${FIRST_PAGE}&page[size]=${pageSize}`,
          last: `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions?page[number]=${pages}&page[size]=${pageSize}`,
          next:
            nextPage <= pages
              ? `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions?page[number]=${nextPage}&page[size]=${pageSize}`
              : null,
          prev:
            previousPage >= 0
              ? `${PROTOCOL}://${HOST}:${PORT}/blocks/${block.id}/transactions?page[number]=${previousPage}&page[size]=${pageSize}`
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

export const buildParticipantSerializer = (): Serializer<Participant> => {
  return new Serializer<Participant>("participant", {
    nullData: false,
    linkers: {
      document: new Linker((participants: Participant) => {
        return `${PROTOCOL}://${HOST}:${PORT}/participants/${participants.id}`;
      }),
      resource: new Linker((pendingTransaction: Participant) => {
        return `${PROTOCOL}://${HOST}:${PORT}/participants/${pendingTransaction.id}`;
      }),
    },
  });
};

export const buildParticipantsSerializer = (
  count: number,
  pageNumber: number,
  pageSize: number
): Serializer<Participant> => {
  const pages = Math.ceil(count / pageSize);

  return new Serializer<Participant>("participant", {
    nullData: false,
    linkers: {
      document: new Linker(() => {
        return `${PROTOCOL}://${HOST}:${PORT}/participants?page[number]=${pageNumber}&page[size]=${pageSize}`;
      }),
      resource: new Linker((pendingTransaction: Participant) => {
        return `${PROTOCOL}://${HOST}:${PORT}/participants/${pendingTransaction.id}`;
      }),
      paginator: new Paginator(() => {
        const nextPage = pageNumber + 1;
        const previousPage = pageNumber - 1;
        return {
          first: `${PROTOCOL}://${HOST}:${PORT}/participants?page[number]=${FIRST_PAGE}&page[size]=${pageSize}`,
          last: `${PROTOCOL}://${HOST}:${PORT}/participants?page[number]=${pages}&page[size]=${pageSize}`,
          next:
            nextPage <= pages
              ? `${PROTOCOL}://${HOST}:${PORT}/participants?page[number]=${nextPage}&page[size]=${pageSize}`
              : null,
          prev:
            previousPage >= 0
              ? `${PROTOCOL}://${HOST}:${PORT}/participants?page[number]=${previousPage}&page[size]=${pageSize}`
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

export const buildNodeSerializer = (): Serializer<Node> => {
  return new Serializer<Node>("node", {
    nullData: false,
    linkers: {
      document: new Linker((nodes: Node) => {
        return `${PROTOCOL}://${HOST}:${PORT}/nodes/${nodes.id}`;
      }),
      resource: new Linker((pendingTransaction: Node) => {
        return `${PROTOCOL}://${HOST}:${PORT}/nodes/${pendingTransaction.id}`;
      }),
    },
  });
};

export const buildNodesSerializer = (
  count: number,
  pageNumber: number,
  pageSize: number
): Serializer<Node> => {
  const pages = Math.ceil(count / pageSize);

  return new Serializer<Node>("node", {
    nullData: false,
    linkers: {
      document: new Linker(() => {
        return `${PROTOCOL}://${HOST}:${PORT}/nodes?page[number]=${pageNumber}&page[size]=${pageSize}`;
      }),
      resource: new Linker((pendingTransaction: Node) => {
        return `${PROTOCOL}://${HOST}:${PORT}/nodes/${pendingTransaction.id}`;
      }),
      paginator: new Paginator(() => {
        const nextPage = pageNumber + 1;
        const previousPage = pageNumber - 1;
        return {
          first: `${PROTOCOL}://${HOST}:${PORT}/nodes?page[number]=${FIRST_PAGE}&page[size]=${pageSize}`,
          last: `${PROTOCOL}://${HOST}:${PORT}/nodes?page[number]=${pages}&page[size]=${pageSize}`,
          next:
            nextPage <= pages
              ? `${PROTOCOL}://${HOST}:${PORT}/nodes?page[number]=${nextPage}&page[size]=${pageSize}`
              : null,
          prev:
            previousPage >= 0
              ? `${PROTOCOL}://${HOST}:${PORT}/nodes?page[number]=${previousPage}&page[size]=${pageSize}`
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
