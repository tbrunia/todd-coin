export interface ApiSettings {
  jwtSecretKey: string;
  apiProtocol: string;
  apiHost: string;
  apiPort: number;
  apiBaseUrl: string;
  hostMaintainerId: string;
}

export interface DatabaseSettings {
  database: string;
  username: string;
  password: string;
  dbHost: string;
  dbPort: number;
}

export interface ApiData<T> {
  id: string;
  attributes: Omit<T, "id">;
  relationships: Record<string, ApiData<any> | Array<ApiData<any>>>;
}

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
