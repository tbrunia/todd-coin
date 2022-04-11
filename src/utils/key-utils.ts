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

export const getKeyPairFromPrivateKey = (privateKey: string): ec.KeyPair => {
  const client: ec = new ec("secp256k1");

  return client.keyFromPrivate(privateKey);
};

export const getKeyPairFromPublicKey = (publicKey: string): ec.KeyPair => {
  const client: ec = new ec("secp256k1");

  return client.keyFromPublic(publicKey, "hex");
};
