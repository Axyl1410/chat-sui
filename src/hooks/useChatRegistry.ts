import { useSuiClient, useSuiClientContext } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import {
  DEVNET_MEMBER_REGISTRY_ID,
  DEVNET_MESSAGE_REGISTRY_ID,
  DEVNET_PROFILE_REGISTRY_ID,
  DEVNET_ROOM_REGISTRY_ID,
  MAINNET_MEMBER_REGISTRY_ID,
  MAINNET_MESSAGE_REGISTRY_ID,
  MAINNET_PROFILE_REGISTRY_ID,
  MAINNET_ROOM_REGISTRY_ID,
  TESTNET_MEMBER_REGISTRY_ID,
  TESTNET_MESSAGE_REGISTRY_ID,
  TESTNET_PROFILE_REGISTRY_ID,
  TESTNET_ROOM_REGISTRY_ID,
} from "../constants";
import { useNetworkVariable } from "../networkConfig";

// Map registry type to constants
const REGISTRY_CONSTANTS = {
  devnet: {
    ProfileRegistry: DEVNET_PROFILE_REGISTRY_ID,
    RoomRegistry: DEVNET_ROOM_REGISTRY_ID,
    MessageRegistry: DEVNET_MESSAGE_REGISTRY_ID,
    RoomMemberRegistry: DEVNET_MEMBER_REGISTRY_ID,
  },
  testnet: {
    ProfileRegistry: TESTNET_PROFILE_REGISTRY_ID,
    RoomRegistry: TESTNET_ROOM_REGISTRY_ID,
    MessageRegistry: TESTNET_MESSAGE_REGISTRY_ID,
    RoomMemberRegistry: TESTNET_MEMBER_REGISTRY_ID,
  },
  mainnet: {
    ProfileRegistry: MAINNET_PROFILE_REGISTRY_ID,
    RoomRegistry: MAINNET_ROOM_REGISTRY_ID,
    MessageRegistry: MAINNET_MESSAGE_REGISTRY_ID,
    RoomMemberRegistry: MAINNET_MEMBER_REGISTRY_ID,
  },
};

export function useChatRegistry(
  type:
    | "ProfileRegistry"
    | "RoomRegistry"
    | "MessageRegistry"
    | "RoomMemberRegistry"
) {
  const chatPackageId = useNetworkVariable("chatPackageId");
  const suiClient = useSuiClient();
  const { network } = useSuiClientContext();
  const typeName = `${chatPackageId}::chat::${type}`;

  // Lấy network từ SuiClientContext, mặc định là testnet
  const currentNetwork = (network || "testnet") as
    | "devnet"
    | "testnet"
    | "mainnet";

  // Kiểm tra xem có hardcode registry ID không
  const hardcodedRegistryId =
    REGISTRY_CONSTANTS[currentNetwork]?.[type] || null;

  // Nếu có hardcode ID, chỉ query object đó (không query từ blockchain bằng queryObjects)
  const directQuery = useQuery({
    queryKey: ["registry", type, hardcodedRegistryId, currentNetwork],
    queryFn: async () => {
      if (!hardcodedRegistryId) {
        return null;
      }
      return await suiClient.getObject({
        id: hardcodedRegistryId,
        options: {
          showContent: true,
          showOwner: true,
        },
      });
    },
    enabled: !!hardcodedRegistryId,
  });

  // Chỉ query từ blockchain nếu KHÔNG có hardcode ID
  const objectsQuery = useQuery({
    queryKey: ["registry", type, chatPackageId, currentNetwork],
    queryFn: async () => {
      if (!chatPackageId || chatPackageId === "0xTODO") {
        return null;
      }
      // For shared objects, query differently
      const result = await (suiClient as any).queryObjectsOwnedByAddress({
        address:
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        filter: {
          StructType: typeName,
        },
        options: {
          showContent: true,
          showOwner: true,
        },
      });
      return result;
    },
    enabled:
      !!chatPackageId && chatPackageId !== "0xTODO" && !hardcodedRegistryId,
  });

  // Nếu có hardcode ID, chỉ dùng direct query (không query từ blockchain)
  if (hardcodedRegistryId) {
    // Transform response để match với format của queryObjects
    return {
      ...directQuery,
      data: directQuery.data
        ? {
            data: [directQuery.data],
          }
        : directQuery.data,
    };
  }

  // Nếu không có hardcode, mới query từ blockchain
  return objectsQuery;
}

export function useProfileRegistry() {
  return useChatRegistry("ProfileRegistry");
}

export function useRoomRegistry() {
  return useChatRegistry("RoomRegistry");
}

export function useMessageRegistry() {
  return useChatRegistry("MessageRegistry");
}

export function useRoomMemberRegistry() {
  return useChatRegistry("RoomMemberRegistry");
}
