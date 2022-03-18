export interface Transaction {
  from?: string;
  to: string;
  amount: number;
  description: string;
  signature?: string;
}

export interface Block {
  timestamp: string;
  transactions: Transaction[];
  nonce: number;
  previousHash: string;
  hash: string;
}

export interface Blockchain {
  chain: Block[];
  pendingTransactions: Transaction[];
  difficulty: number;
  miningReward: number;
}

export interface ParticipantKey {
  public: string;
  private?: string;
}

export interface Participant {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  key: ParticipantKey;
}
