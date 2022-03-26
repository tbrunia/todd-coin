import { ec } from "elliptic";
import { ParticipantKey } from "../types";

export const generateParticipantKey = (): ParticipantKey => {
  const client: ec = new ec("secp256k1");
  const key: ec.KeyPair = client.genKeyPair();
  const publicKey: string = key.getPublic("hex");
  const privateKey: string = key.getPrivate("hex");

  return {
    public: publicKey,
    private: privateKey,
  };
};
