import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Button, Flex, Text, TextField } from "@radix-ui/themes";
import { useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";
import {
  useMessageRegistry,
  useProfileRegistry,
  useRoomMemberRegistry,
  useRoomRegistry,
} from "./hooks/useChatRegistry";
import { useNetworkVariable } from "./networkConfig";

export function SendMessage({
  roomId,
  onSent,
}: {
  roomId: string;
  onSent?: () => void;
}) {
  const chatPackageId = useNetworkVariable("chatPackageId");
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { data: profileRegistryData } = useProfileRegistry();
  const { data: roomRegistryData } = useRoomRegistry();
  const { data: messageRegistryData } = useMessageRegistry();
  const { data: memberRegistryData } = useRoomMemberRegistry();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  const profileRegistryId = profileRegistryData?.data?.[0]?.data?.objectId;
  const roomRegistryId = roomRegistryData?.data?.[0]?.data?.objectId;
  const messageRegistryId = messageRegistryData?.data?.[0]?.data?.objectId;
  const memberRegistryId = memberRegistryData?.data?.[0]?.data?.objectId;

  function send() {
    if (
      !(
        profileRegistryId &&
        roomRegistryId &&
        messageRegistryId &&
        memberRegistryId
      )
    ) {
      setError("Registries not found");
      return;
    }

    if (content.length < 1 || content.length > 2000) {
      setError("Message must be between 1 and 2000 characters");
      return;
    }

    setError("");

    const tx = new Transaction();

    tx.moveCall({
      arguments: [
        tx.object(profileRegistryId),
        tx.object(roomRegistryId),
        tx.object(roomId),
        tx.object(messageRegistryId),
        tx.object(memberRegistryId),
        tx.pure.string(content),
        tx.object("0x6"), // Clock shared object ID
      ],
      target: `${chatPackageId}::chat::send_message`,
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

          setContent("");
          if (onSent) {
            onSent();
          }
        },
        onError: (err) => {
          setError(err.message || "Failed to send message");
        },
      }
    );
  }

  if (!currentAccount) {
    return <Text>Please connect your wallet</Text>;
  }

  return (
    <Flex direction="column" gap="2">
      <Flex direction="row" gap="2">
        <TextField.Root
          disabled={
            isPending ||
            !profileRegistryId ||
            !roomRegistryId ||
            !messageRegistryId ||
            !memberRegistryId
          }
          onChange={(e) => {
            setContent(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (content.trim() && !isPending) {
                send();
              }
            }
          }}
          placeholder="Type your message..."
          style={{ flex: 1 }}
          value={content}
        />
        <Button
          disabled={
            isPending ||
            !content.trim() ||
            !profileRegistryId ||
            !roomRegistryId ||
            !messageRegistryId ||
            !memberRegistryId
          }
          onClick={() => {
            send();
          }}
        >
          {isPending ? <ClipLoader size={16} /> : "Send"}
        </Button>
      </Flex>
      {error && (
        <Text color="red" size="2">
          {error}
        </Text>
      )}
    </Flex>
  );
}
