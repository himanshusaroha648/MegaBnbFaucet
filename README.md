# MegaBnbFaucet - Blockchain Testnet Tools

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive toolkit for interacting with MegaBNB Testnet and other EVM-compatible networks. This suite includes wallet management, faucet automation, and educational crypto tools.

## 🌟 Features

- **Wallet Management** - Generate, load, and manage ETH/BNB compatible wallets
- **Faucet Automation** - Claim testnet tokens automatically with configurable intervals
- **Balance Tracking** - Monitor wallet balances across all loaded accounts
- **Bulk Transfers** - Transfer tokens from multiple wallets to a single address
- **Interactive Learning** - Gamified crypto learning mode with quizzes and achievements

## 📋 Prerequisites

- Node.js (v16.x or higher)
- npm (v8.x or higher)

## 🚀 Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/himanshusaroha648/MegaBnbFaucet.git
   cd MegaBnbFaucet
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your configuration:
   ```
   # Network Configuration
   BNB_RPC_URL=https://rpc.mbscan.io/
   BNB_CHAIN_ID=696969
   BNB_EXPLORER_URL=https://mbscan.io
   
   # Wallet Configuration (Optional)
   PRIVATE_KEY=your_private_key_here
   ```

## 💼 Usage

### Main Utility (`main.js`)

The main script provides an all-in-one interface for wallet management, faucet claiming, and fund transfers:
