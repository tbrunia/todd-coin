export interface ParticipantKey {
  public: string;
  private?: string;
}

export enum Roles {
  VOLUNTEER = "VOLUNTEER",
  CHARITY = "CHARITY",
  NODE = "NODE",
}

export interface Participant {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  key: ParticipantKey;
  roles?: Roles[];
}

export interface Transaction {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  from?: string;
  to: string;
  amount: number;
  description: string;
  signature?: string;
}

export interface Block {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  transactions: Transaction[];
  nonce: number;
  previousHash: string;
  hash: string;
}

export interface Node {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  baseUrl: string;
}

export interface ApiData {
  id: string;
  attributes: Record<string, string | number | boolean | object>;
}
