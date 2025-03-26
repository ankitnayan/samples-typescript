export const namespace = process.env.NAMESPACE || 'default'
import {config} from 'dotenv'; 
import * as fs from 'fs/promises';
config();  // Load environment variables from .env file 

interface ConnectionOptions {
  address: string
  tls?: { clientCertPair: { crt: Buffer; key: Buffer } }
}

export async function getConnectionOptions(): Promise<ConnectionOptions> {
  const { NODE_ENV = 'development' } = process.env
  
  const TEMPORAL_SERVER = process.env.TEMPORAL_SERVER ||  'localhost:7233'

  
  const isDeployed = ['production', 'staging'].includes(NODE_ENV)
  console.log('Is Deployed:', isDeployed);

  if (isDeployed) {
    try {
      const cert = await fs.readFile('/Users/ankitnayan/Desktop/temporal-certs/temporal-ca.pem');
      const key = await fs.readFile('/Users/ankitnayan/Desktop/temporal-certs/temporal-ca.key');


      const options = {
        address: TEMPORAL_SERVER,
        tls: {
          clientCertPair: {
            crt: cert,
            key,
          },
        },
      };
      console.log('Returning TLS config for', TEMPORAL_SERVER);
      return options;
    } catch (error) {
      console.error('Error loading certificates:', error);
      throw error;
    }
  }

  console.log('Returning non-TLS config for', TEMPORAL_SERVER);
  return {
    address: TEMPORAL_SERVER,
  }
}