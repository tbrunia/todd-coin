import { ApiSettings, Participant } from "../types";
import { SequelizeClient } from "../brokers/sequelize-client";
import { getParticipantById } from "../brokers/paticipants-broker";

export const getRoot =
  (sequelizeClient: SequelizeClient, apiSettings: ApiSettings) => async () => {
    const { apiBaseUrl, hostMaintainerId } = apiSettings;

    const participant: Participant = await getParticipantById(
      sequelizeClient,
      hostMaintainerId
    );

    return {
      links: {
        self: apiBaseUrl,
        blocks: `${apiBaseUrl}/blocks`,
        nodes: `${apiBaseUrl}/nodes`,
        participants: `${apiBaseUrl}/participants`,
        pendingTransactions: `${apiBaseUrl}/pending-transactions`,
      },
      data: {
        description: "I'm a todd-coin node.",
        hostMaintainer: participant,
      },
    };
  };
