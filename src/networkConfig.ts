import { createNetworkConfig } from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import {
  DEVNET_CHAT_PACKAGE_ID,
  DEVNET_COUNTER_PACKAGE_ID,
  MAINNET_CHAT_PACKAGE_ID,
  MAINNET_COUNTER_PACKAGE_ID,
  TESTNET_CHAT_PACKAGE_ID,
  TESTNET_COUNTER_PACKAGE_ID,
} from "./constants.ts";

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    devnet: {
      url: getFullnodeUrl("devnet"),
      variables: {
        counterPackageId: DEVNET_COUNTER_PACKAGE_ID,
        chatPackageId: DEVNET_CHAT_PACKAGE_ID,
      },
    },
    testnet: {
      url: getFullnodeUrl("testnet"),
      variables: {
        counterPackageId: TESTNET_COUNTER_PACKAGE_ID,
        chatPackageId: TESTNET_CHAT_PACKAGE_ID,
      },
    },
    mainnet: {
      url: getFullnodeUrl("mainnet"),
      variables: {
        counterPackageId: MAINNET_COUNTER_PACKAGE_ID,
        chatPackageId: MAINNET_CHAT_PACKAGE_ID,
      },
    },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };
