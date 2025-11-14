import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Button, Text } from "@radix-ui/themes";
import { useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";
import {
  useProfileRegistry,
  useRoomMemberRegistry,
} from "./hooks/useChatRegistry";
import { useNetworkVariable } from "./networkConfig";

export function JoinRoom({
  roomId,
  onJoined,
}: {
  roomId: string;
  onJoined?: () => void;
}) {
  const chatPackageId = useNetworkVariable("chatPackageId");
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { data: profileRegistryData } = useProfileRegistry();
  const { data: memberRegistryData } = useRoomMemberRegistry();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const [error, setError] = useState("");

  const profileRegistryId = profileRegistryData?.data?.[0]?.data?.objectId;
  const memberRegistryId = memberRegistryData?.data?.[0]?.data?.objectId;

  function join() {
    if (!(profileRegistryId && memberRegistryId)) {
      setError("Registries not found");
      return;
    }

    setError("");

    const tx = new Transaction();

    tx.moveCall({
      arguments: [
        tx.object(profileRegistryId),
        tx.object(roomId),
        tx.object(memberRegistryId),
      ],
      target: `${chatPackageId}::chat::join_room`,
    });

    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: async ({ digest }) => {
          await suiClient.waitForTransaction({
            digest,
            options: {
              showEffects: true,
              showEvents: true,
            },
          });

          if (onJoined) {
            onJoined();
          }
        },
        onError: (err) => {
          setError(err.message || "Failed to join room");
        },
      }
    );
  }

  if (!currentAccount) {
    return <Text>Please connect your wallet</Text>;
  }

  return (
    <>
      <Button
        disabled={isPending || !profileRegistryId || !memberRegistryId}
        onClick={() => {
          join();
        }}
        size="2"
      >
        {isPending ? <ClipLoader size={16} /> : "Join Room"}
      </Button>
      {error && (
        <Text color="red" size="2">
          {error}
        </Text>
      )}
    </>
  );
}
