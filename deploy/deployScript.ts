import { createClient, createAccount } from 'genlayer-js';
import { studionet, localnet, testnetAsimov } from 'genlayer-js/chains';
import * as fs from 'fs';
import * as path from 'path';

async function deploy() {
  // Determine network from environment or default to localnet
  const network = process.env.GENLAYER_NETWORK || 'localnet';
  
  let chain;
  switch (network) {
    case 'studionet':
      chain = studionet;
      break;
    case 'testnet':
    case 'testnet-asimov':
      chain = testnetAsimov;
      break;
    default:
      chain = localnet;
  }

  console.log(`Deploying to ${network}...`);

  // Create account for deployment
  const account = createAccount();
  console.log(`Deployer address: ${account.address}`);

  // Create client
  const client = createClient({
    chain,
    account,
  });

  // Initialize consensus
  await client.initializeConsensusSmartContract();

  // Read contract code
  const contractPath = path.join(__dirname, '../contracts/prediction_market.py');
  const contractCode = fs.readFileSync(contractPath, 'utf-8');

  console.log('Deploying PredictionMarket contract...');

  try {
    // Deploy contract
    const txHash = await client.deployContract({
      code: contractCode,
      args: [],
    });

    console.log(`Transaction hash: ${txHash}`);

    // Wait for deployment
    const receipt = await client.waitForTransactionReceipt({
      hash: txHash,
      status: 'FINALIZED',
    });

    console.log('Contract deployed successfully!');
    console.log(`Contract address: ${receipt.contractAddress}`);
    console.log('\nAdd this to your frontend/.env file:');
    console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${receipt.contractAddress}`);

    return receipt.contractAddress;
  } catch (error) {
    console.error('Deployment failed:', error);
    throw error;
  }
}

deploy()
  .then((address) => {
    console.log('\nDeployment complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Deployment failed:', error);
    process.exit(1);
  });
