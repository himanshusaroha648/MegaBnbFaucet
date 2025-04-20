import { ethers } from 'ethers';
import * as fs from 'fs';
import axios from 'axios';
import chalk from 'chalk';
import readlineSync from 'readline-sync';
import * as dotenv from 'dotenv';
dotenv.config();

// Configuration
const WALLET_FILE = "account.txt";
const NETWORK_URL = process.env.BNB_RPC_URL || 'https://rpc.mbscan.io/';
const NETWORK_NAME = 'MegaBNB Testnet';
const CURRENCY_SYMBOL = 'BNB';

// Faucet Configuration
const FAUCET_URL = "https://mbscan.io/airdrop";
const FAUCET_HEADERS = {
  "Accept": "*/*",
  "Content-Type": "application/json",
  "Origin": "https://mbscan.io",
  "Referer": "https://mbscan.io/",
};

// Delay settings
const CLAIM_DELAY = 2000; // 2 seconds between claims
const CYCLE_DELAY = 5000; // 5 seconds between cycles

// Initialize wallet array
let wallets = [];

// Initialize logger
function log(message) {
  console.log(message);
}

// Create a new Ethereum account
function createWallet() {
  const wallet = ethers.Wallet.createRandom();
  const address = wallet.address;
  const privateKey = wallet.privateKey;
  const mnemonic = wallet.mnemonic.phrase;

  return { address, privateKey, mnemonic };
}

// Generate multiple wallets
async function generateWallets(count) {
  try {
    log(chalk.cyan("========================================="));
    log(chalk.cyan(`🔗 EVM Wallet Generator 🔗`));
    log(chalk.cyan("========================================="));
    
    let walletCount = count;
    
    if (!walletCount || isNaN(walletCount) || walletCount <= 0) {
      walletCount = readlineSync.question(
        chalk.yellow('Input how many wallets you want to create: ')
      );
      
      walletCount = parseInt(walletCount);
      if (isNaN(walletCount) || walletCount <= 0) {
        log(chalk.red('Please enter a valid number greater than 0.'));
        return;
      }
    }

    log(chalk.green(`Creating ${walletCount} new wallets and saving to ${WALLET_FILE}...`));
    
    // Check if file exists and handle accordingly
    if (fs.existsSync(WALLET_FILE)) {
      const overwrite = readlineSync.keyInYN(
        chalk.yellow(`${WALLET_FILE} already exists. Do you want to overwrite it?`)
      );
      
      if (!overwrite) {
        log(chalk.yellow(`Appending to existing file ${WALLET_FILE}...`));
      } else {
        // Overwrite by creating empty file
        fs.writeFileSync(WALLET_FILE, '');
        log(chalk.yellow(`Overwriting ${WALLET_FILE}...`));
      }
    }

    // Generate and save wallets
    const newWallets = [];
    for (let i = 0; i < walletCount; i++) {
      const wallet = createWallet();
      newWallets.push(wallet);
      
      // Save wallet to file (format: address|privateKey)
      fs.appendFileSync(
        WALLET_FILE,
        `${wallet.address}|${wallet.privateKey}\n`
      );
      
      log(chalk.green(`[${i+1}/${walletCount}] Wallet created and saved:`));
      log(chalk.cyan(`   Address:    ${wallet.address}`));
      log(chalk.yellow(`   Private Key: ${wallet.privateKey}`));
      log(chalk.gray(`   Mnemonic:   ${wallet.mnemonic}`));
      log("");
    }

    log(chalk.green(`✅ All ${walletCount} wallets have been created and saved to ${WALLET_FILE}`));
    log(chalk.cyan(`File format: address|privateKey`));
    log(chalk.yellow(`IMPORTANT: Keep your private keys secure!`));
    
    return newWallets;
  } catch (error) {
    log(chalk.red(`Error generating wallets: ${error.message}`));
    return [];
  }
}

// Load wallets from account.txt file
function loadWallets() {
  try {
    if (!fs.existsSync(WALLET_FILE)) {
      log(chalk.red(`${WALLET_FILE} not found. You need to generate wallets first.`));
      return [];
    }

    const fileContent = fs.readFileSync(WALLET_FILE, 'utf8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    const loadedWallets = lines.map(line => {
      const [address, privateKey] = line.split('|');
      return { address, privateKey, balance: "0" };
    });

    log(chalk.green(`Loaded ${loadedWallets.length} wallets from ${WALLET_FILE}`));
    return loadedWallets;
  } catch (error) {
    log(chalk.red(`Error loading wallets: ${error.message}`));
    return [];
  }
}

// Connect to the network
async function connectToNetwork() {
  try {
    const provider = new ethers.JsonRpcProvider(NETWORK_URL);
    log(chalk.cyan(`Connected to ${NETWORK_NAME}`));
    return provider;
  } catch (error) {
    log(chalk.red(`Error connecting to network: ${error.message}`));
    return null;
  }
}

// Check balance of all wallets
async function checkBalances(provider) {
  if (!provider) {
    log(chalk.red("No provider available. Cannot check balances."));
    return;
  }
  
  if (wallets.length === 0) {
    log(chalk.red("No wallets loaded. Cannot check balances."));
    return;
  }

  log(chalk.cyan("\n=== CHECKING WALLET BALANCES ==="));
  let totalBalance = ethers.parseEther("0");

  for (let i = 0; i < wallets.length; i++) {
    try {
      const balance = await provider.getBalance(wallets[i].address);
      const formattedBalance = ethers.formatEther(balance);
      wallets[i].balance = formattedBalance;
      wallets[i].balanceWei = balance;
      totalBalance = totalBalance + balance;
      
      log(chalk.green(`[${i+1}/${wallets.length}] ${wallets[i].address}: ${formattedBalance} ${CURRENCY_SYMBOL}`));
    } catch (error) {
      log(chalk.red(`Error checking balance for ${wallets[i].address}: ${error.message}`));
      wallets[i].balance = "Error";
    }
  }

  const totalFormatted = ethers.formatEther(totalBalance);
  log(chalk.cyan(`Total balance across all wallets: ${totalFormatted} ${CURRENCY_SYMBOL}`));
  return totalBalance;
}

// Claim faucet tokens for a wallet
async function claimFaucet(address) {
  try {
    const response = await axios.post(FAUCET_URL, 
      { address }, 
      { headers: FAUCET_HEADERS }
    );

    if (response.status === 200 && response.data.success) {
      const amount = response.data.amount;
      const txHash = response.data.tx_hash;
      log(chalk.green(`✅ Claim success for ${address} - ${amount} ${CURRENCY_SYMBOL} | TX: 0x${txHash}`));
      return { success: true, amount, txHash };
    } else {
      log(chalk.yellow(`⚠️ Claim failed for ${address}: ${JSON.stringify(response.data)}`));
      return { success: false, message: response.data };
    }
  } catch (error) {
    log(chalk.red(`❌ Error claiming faucet for ${address}: ${error.message}`));
    return { success: false, message: error.message };
  }
}

// Claim faucet for all wallets
async function claimAllWallets(numClaims = 1) {
  if (wallets.length === 0) {
    log(chalk.red("No wallets loaded. Please generate or load wallets first."));
    return;
  }

  log(chalk.cyan(`\n=== CLAIMING FAUCET FOR ALL WALLETS (${numClaims} time(s) each) ===`));
  
  for (let i = 0; i < wallets.length; i++) {
    log(chalk.cyan(`\nProcessing wallet ${i+1}/${wallets.length}: ${wallets[i].address}`));
    
    for (let j = 0; j < numClaims; j++) {
      log(chalk.yellow(`Claim ${j+1}/${numClaims} for ${wallets[i].address}`));
      await claimFaucet(wallets[i].address);
      
      if (j < numClaims - 1) {
        // Add a small delay between claims
        log(chalk.gray(`Waiting ${CLAIM_DELAY/1000} seconds before next claim...`));
        await new Promise(resolve => setTimeout(resolve, CLAIM_DELAY));
      }
    }
  }
  
  // Wait a bit for transactions to confirm
  log(chalk.gray(`\nWaiting for transactions to confirm...`));
  await new Promise(resolve => setTimeout(resolve, CYCLE_DELAY));
}

// Transfer tokens from all wallets to single address
async function transferToAddress(targetAddress, provider) {
  if (!provider) {
    log(chalk.red("No provider available. Cannot transfer tokens."));
    return;
  }

  if (wallets.length === 0) {
    log(chalk.red("No wallets loaded. Please generate or load wallets first."));
    return;
  }

  // Validate target address
  if (!ethers.isAddress(targetAddress)) {
    log(chalk.red(`Invalid target address: ${targetAddress}`));
    return;
  }

  log(chalk.cyan(`\n=== TRANSFERRING FUNDS TO TARGET ADDRESS ===`));
  log(chalk.cyan(`Target address: ${targetAddress}`));
  
  let successCount = 0;
  let totalSent = ethers.parseEther("0");
  
  for (let i = 0; i < wallets.length; i++) {
    try {
      const wallet = new ethers.Wallet(wallets[i].privateKey, provider);
      const balance = await provider.getBalance(wallet.address);
      
      // Skip if balance is too low
      if (balance <= ethers.parseEther("0.0001")) {
        log(chalk.yellow(`[${i+1}/${wallets.length}] Skipping ${wallet.address} - balance too low (${ethers.formatEther(balance)} ${CURRENCY_SYMBOL})`));
        continue;
      }
      
      // Calculate amount to send (balance minus gas buffer)
      const gasBuffer = ethers.parseEther("0.0001");
      const amountToSend = balance - gasBuffer;
      
      // Send transaction
      log(chalk.yellow(`[${i+1}/${wallets.length}] Sending ${ethers.formatEther(amountToSend)} ${CURRENCY_SYMBOL} from ${wallet.address}...`));
      
      const tx = {
        to: targetAddress,
        value: amountToSend
      };
      
      const txResponse = await wallet.sendTransaction(tx);
      log(chalk.green(`Transaction sent! Hash: ${txResponse.hash}`));
      
      successCount++;
      totalSent = totalSent + amountToSend;
      
      // Wait a bit between transactions
      if (i < wallets.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      log(chalk.red(`Error transferring from ${wallets[i].address}: ${error.message}`));
    }
  }
  
  log(chalk.green(`\nTransfer summary:`));
  log(chalk.green(`- Successfully transferred from ${successCount}/${wallets.length} wallets`));
  log(chalk.green(`- Total amount sent: ${ethers.formatEther(totalSent)} ${CURRENCY_SYMBOL}`));
  
  return { successCount, totalSent };
}

// Main menu for wallet management
async function showMenu() {
  log(chalk.cyan("========================================="));
  log(chalk.cyan(`🔗 Wallet Manager & Faucet Claimer 🔗`));
  log(chalk.cyan("========================================="));

  // Connect to network
  const provider = await connectToNetwork();
  
  // Load wallets if any exist
  wallets = loadWallets();
  
  while (true) {
    console.log("\n");
    console.log(chalk.cyan("1. Generate new wallets"));
    console.log(chalk.cyan("2. Load wallets from file"));
    console.log(chalk.cyan("3. Check all wallet balances"));
    console.log(chalk.cyan("4. Claim faucet (1 time per wallet)"));
    console.log(chalk.cyan("5. Claim faucet multiple times"));
    console.log(chalk.cyan("6. Transfer all funds to address"));
    console.log(chalk.cyan("7. Exit"));
    console.log(chalk.gray(`Current wallets loaded: ${wallets.length}`));
    
    const choice = readlineSync.question(chalk.yellow("Select an option (1-7): "));
    
    switch (choice) {
      case "1":
        const count = readlineSync.question(chalk.yellow("How many wallets do you want to generate? "));
        const newWallets = await generateWallets(parseInt(count));
        wallets = [...wallets, ...newWallets];
        break;
        
      case "2":
        wallets = loadWallets();
        break;
        
      case "3":
        await checkBalances(provider);
        break;
        
      case "4":
        await claimAllWallets(1);
        await checkBalances(provider);
        break;
        
      case "5":
        const numClaims = readlineSync.question(chalk.yellow("How many claims per wallet? "));
        await claimAllWallets(parseInt(numClaims) || 1);
        await checkBalances(provider);
        break;
        
      case "6":
        const targetAddress = readlineSync.question(chalk.yellow("Enter address to receive funds: "));
        await transferToAddress(targetAddress, provider);
        await checkBalances(provider);
        break;
        
      case "7":
        log(chalk.green("Exiting program. Goodbye!"));
        process.exit(0);
        
      default:
        log(chalk.red("Invalid option. Please try again."));
    }
  }
}

// Batch mode for automated operation
async function batchMode(claimCount, targetAddress) {
  try {
    log(chalk.cyan("========================================="));
    log(chalk.cyan(`🔗 Batch Mode: Claim & Transfer 🔗`));
    log(chalk.cyan("========================================="));
    
    // Connect to network
    const provider = await connectToNetwork();
    
    // Load wallets
    wallets = loadWallets();
    
    if (wallets.length === 0) {
      log(chalk.red("No wallets found. Please run with -g option to generate wallets first."));
      process.exit(1);
    }
    
    // Initial balance check
    log(chalk.cyan("Checking initial balances..."));
    await checkBalances(provider);
    
    // Claim faucet
    if (claimCount > 0) {
      await claimAllWallets(claimCount);
      
      // Check balances after claiming
      log(chalk.cyan("Checking balances after claiming..."));
      await checkBalances(provider);
    }
    
    // Transfer funds if target address provided
    if (targetAddress && ethers.isAddress(targetAddress)) {
      await transferToAddress(targetAddress, provider);
      
      // Final balance check
      log(chalk.cyan("Checking final balances..."));
      await checkBalances(provider);
    }
    
    log(chalk.green("Batch operation completed successfully!"));
    
  } catch (error) {
    log(chalk.red(`Fatal error: ${error.message}`));
    process.exit(1);
  }
}

// Main function
async function main() {
  try {
    const args = process.argv.slice(2);
    
    // Handle command line arguments for batch processing
    if (args.length > 0) {
      // Check for help flag
      if (args.includes('-h') || args.includes('--help')) {
        log(chalk.cyan("Wallet Manager & Faucet Claimer - Help"));
        log(chalk.cyan("Usage:"));
        log(chalk.cyan("  node wallet-manager.js                   - Interactive mode"));
        log(chalk.cyan("  node wallet-manager.js -g [count]        - Generate wallets"));
        log(chalk.cyan("  node wallet-manager.js -c [count] -t [address] - Claim and transfer"));
        log(chalk.cyan("Options:"));
        log(chalk.cyan("  -g, --generate [count]   - Generate [count] wallets"));
        log(chalk.cyan("  -c, --claim [count]      - Claim faucet [count] times per wallet"));
        log(chalk.cyan("  -t, --transfer [address] - Transfer funds to [address]"));
        log(chalk.cyan("  -h, --help               - Show this help message"));
        process.exit(0);
      }
      
      // Check for generate flag
      const genIndex = args.findIndex(arg => arg === '-g' || arg === '--generate');
      if (genIndex !== -1 && args.length > genIndex + 1) {
        const count = parseInt(args[genIndex + 1]);
        if (!isNaN(count) && count > 0) {
          await generateWallets(count);
          process.exit(0);
        }
      }
      
      // Check for batch mode
      const claimIndex = args.findIndex(arg => arg === '-c' || arg === '--claim');
      const transferIndex = args.findIndex(arg => arg === '-t' || arg === '--transfer');
      
      if (claimIndex !== -1 || transferIndex !== -1) {
        const claimCount = claimIndex !== -1 && args.length > claimIndex + 1 ? 
          parseInt(args[claimIndex + 1]) : 0;
        
        const targetAddress = transferIndex !== -1 && args.length > transferIndex + 1 ? 
          args[transferIndex + 1] : null;
        
        await batchMode(claimCount, targetAddress);
        process.exit(0);
      }
    }
    
    // Default to interactive mode if no special arguments
    await showMenu();
    
  } catch (error) {
    log(chalk.red(`Fatal error: ${error.message}`));
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error(chalk.red(`Unhandled error: ${error.message}`));
  process.exit(1);
});
