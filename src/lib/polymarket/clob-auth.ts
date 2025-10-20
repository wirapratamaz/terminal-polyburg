import { ClobClient } from "@polymarket/clob-client";
import { Wallet } from "ethers";

/**
 * Derive proper API credentials from private key using Polymarket CLOB client
 */
export class PolymarketClobAuth {
  private host = 'https://clob.polymarket.com';
  private chainId = 137; // Polygon mainnet
  private signer: Wallet;
  private clobClient: ClobClient;

  constructor(privateKey: string) {
    // Ensure private key has 0x prefix
    const formattedPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;

    console.log('🔐 Initializing CLOB authentication...');
    console.log('   - Private key length:', formattedPrivateKey.length);
    console.log('   - Chain ID:', this.chainId);
    console.log('   - Host:', this.host);

    this.signer = new Wallet(formattedPrivateKey);
    this.clobClient = new ClobClient(this.host, this.chainId, this.signer);

    console.log('   - Wallet address:', this.signer.address);
  }

  /**
   * Derive API key credentials from the private key
   */
  async deriveApiCredentials(): Promise<{key: string, secret: string, passphrase: string}> {
    try {
      console.log('🔄 Deriving API credentials from private key...');

      const apiCreds = await this.clobClient.deriveApiKey();

      console.log('✅ API credentials response structure:', typeof apiCreds, apiCreds);
      console.log('✅ API credentials keys:', Object.keys(apiCreds || {}));
      console.log('   - API Key preview:', apiCreds?.key ? `${apiCreds.key.substring(0, 15)}...` : 'undefined');
      console.log('   - Secret preview:', apiCreds?.secret ? `${apiCreds.secret.substring(0, 8)}...` : 'undefined');
      console.log('   - Passphrase preview:', apiCreds?.passphrase ? `${apiCreds.passphrase.substring(0, 8)}...` : 'undefined');

      return apiCreds;
    } catch (error) {
      console.error('❌ Failed to derive API credentials:', error);
      throw error;
    }
  }

  /**
   * Get the wallet address derived from private key
   */
  getWalletAddress(): string {
    return this.signer.address;
  }

  /**
   * Get the CLOB client instance
   */
  getClobClient(): ClobClient {
    return this.clobClient;
  }
}

/**
 * Initialize and derive API credentials for the application
 */
export async function initializePolymarketAuth(privateKey: string): Promise<{
  apiKey: string;
  secret: string;
  passphrase: string;
  walletAddress: string;
}> {
  const auth = new PolymarketClobAuth(privateKey);
  const creds = await auth.deriveApiCredentials();

  return {
    apiKey: creds.key,
    secret: creds.secret,
    passphrase: creds.passphrase,
    walletAddress: auth.getWalletAddress()
  };
}