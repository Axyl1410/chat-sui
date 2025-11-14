import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Button, Text } from "@radix-ui/themes";
import { useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";
import { useRoomMemberRegistry } from "./hooks/useChatRegistry";
import { useNetworkVariable } from "./networkConfig";

export function LeaveRoom({
  roomId,
  onLeft,
}: {
  roomId: string;
  onLeft?: () => void;
}) {
  const chatPackageId = useNetworkVariable("chatPackageId");
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { data: memberRegistryData } = useRoomMemberRegistry();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const [error, setError] = useState("");

  const memberRegistryId = memberRegistryData?.data?.[0]?.data?.objectId;

  function leave() {
    if (!memberRegistryId) {
      setError("Member registry not found");
      return;
    }

    setError("");

    const tx = new Transaction();

    tx.moveCall({
      arguments: [tx.object(roomId), tx.object(memberRegistryId)],
      target: `${chatPackageId}::chat::leave_room`,
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

          if (onLeft) {
            onLeft();
          }
        },
        onError: (err) => {
          setError(err.message || "Failed to leave room");
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
        color="red"
        disabled={isPending || !memberRegistryId}
        onClick={() => {
          leave();
        }}
        size="2"
        variant="soft"
      >
        {isPending ? <ClipLoader size={16} /> : "Leave Room"}
      </Button>
      {error && (
        <Text color="red" size="2">
          {error}
        </Text>
      )}
    </>
  );
}
