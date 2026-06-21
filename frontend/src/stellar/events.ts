import * as PasswordVault from '../contracts/password-vault';

const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || '';
const RPC_URL = 'https://soroban-testnet.stellar.org:443';

export interface ContractEvent {
  id: string;
  type: string;
  ledger: number;
  contractId: string;
  topic: string[];
  value: string;
}

let lastLedger: number = 0;

/**
 * Polls the Soroban RPC server for any events emitted by this contract involving the user.
 */
export async function fetchContractEvents(userAddress: string): Promise<ContractEvent[]> {
  if (!CONTRACT_ID) return [];

  try {
    const server = new PasswordVault.rpc.Server(RPC_URL);

    // Get the latest ledger if not established
    if (lastLedger === 0) {
      const info = await server.getLatestLedger();
      lastLedger = info.sequence - 5; // start 5 ledgers back to catch anything recent
    }

    const response = await server.getEvents({
      startLedger: lastLedger,
      filters: [
        {
          contractIds: [CONTRACT_ID],
          topics: [
            ['*', userAddress]
          ],
          type: 'contract'
        }
      ],
      limit: 10
    });

    if (response.events && response.events.length > 0) {
      const maxLedger = Math.max(...response.events.map(e => e.ledger));
      if (maxLedger >= lastLedger) {
        lastLedger = maxLedger + 1;
      }
      return response.events.map(e => ({
        id: e.id,
        type: e.type,
        ledger: e.ledger,
        contractId: e.contractId,
        topic: e.topic,
        value: e.value
      }));
    }
  } catch (error) {
    console.warn('Error fetching Soroban events (polling is ignored in offline/mock mode):', error);
  }

  return [];
}
