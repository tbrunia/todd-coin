export interface ParticipantKey {
  public: string;
  private?: string;
}

export interface Participant {
  id: string;
  name: string;
  key: ParticipantKey;
}

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
  participants: Participant[];
  difficulty: number;
  miningReward: number;
}
