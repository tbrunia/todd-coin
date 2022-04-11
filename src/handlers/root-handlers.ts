import { ApiSettings, Participant } from "../types";
import { SequelizeClient } from "../brokers/sequelize-client";
import { getParticipantById } from "../brokers/paticipants-broker";

export const getRoot =
  (sequelizeClient: SequelizeClient, apiSettings: ApiSettings) => async () => {
    const { apiBaseUrl, hostMaintainerId } = apiSettings;

    return {
      jsonapi: {
        version: "1.0",
      },
      links: {
        self: apiBaseUrl,
      },
      data: {
        attributes: {
          // todo - add server start time, location, etc.
          description: "I'm a todd-coin node.",
          authentication: `To authenticate, post your private key {\"privateKey\": \"your-private-key\"} to ${apiBaseUrl}/auth/token. Then, include the accessToken property returned with the response in the authentication header (ex: authentication: bearer your-access-token) of each subsequent request to the Todd Coin API. The access token expires in 60 minutes.`,
        },
        relationships: {
          // todo - add some paginated blocks data (id only)
          blocks: {
            links: {
              related: `${apiBaseUrl}/blocks`,
            },
          },
          nodes: {
            // todo - add some paginated nodes data (id only)
            links: {
              related: `${apiBaseUrl}/nodes`,
            },
          },
          participants: {
            // todo - add some paginated participants data (id only)
            links: {
              related: `${apiBaseUrl}/participants`,
            },
          },
          pendingTransactions: {
            // todo - add some paginated pending transactions data (id only)
            links: {
              related: `${apiBaseUrl}/pending-transactions`,
            },
          },
          signedTransactions: {
            // todo - add some paginated signed transactions data (id only)
            links: {
              related: `${apiBaseUrl}/signed-transactions`,
            },
          },
          hostMaintainer: {
            data: {
              type: "participant",
              id: hostMaintainerId,
            },
            links: {
              related: `${apiBaseUrl}/participants/${hostMaintainerId}`,
            },
          },
        },
      },
    };
  };
