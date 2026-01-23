require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition-ethers");

// Only load polkadot plugin when targeting polkadot network
const isPolkadotNetwork = process.env.HARDHAT_NETWORK === "paseo";
if (isPolkadotNetwork) {
  require("@parity/hardhat-polkadot");
}

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      // Local testing network (default)
    },
    paseo: {
      url: "https://testnet-passet-hub-eth-rpc.polkadot.io",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  // PolkaVM-specific configuration
  resolc: {
    compilerSource: "npm",
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
