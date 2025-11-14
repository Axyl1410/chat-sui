import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import {
  Button,
  Container,
  Flex,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";
import {
  useProfileRegistry,
  useRoomMemberRegistry,
  useRoomRegistry,
} from "./hooks/useChatRegistry";
import { useNetworkVariable } from "./networkConfig";

export function CreateRoom({
  onCreated,
}: {
  onCreated?: (id: string) => void;
}) {
  const chatPackageId = useNetworkVariable("chatPackageId");
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { data: profileRegistryData } = useProfileRegistry();
  const { data: roomRegistryData } = useRoomRegistry();
  const { data: memberRegistryData } = useRoomMemberRegistry();
  const {
    mutate: signAndExecute,
    isSuccess,
    isPending,
  } = useSignAndExecuteTransaction();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  const profileRegistryId = profileRegistryData?.data?.[0]?.data?.objectId;
  const roomRegistryId = roomRegistryData?.data?.[0]?.data?.objectId;
  const memberRegistryId = memberRegistryData?.data?.[0]?.data?.objectId;

  function create() {
    if (!(profileRegistryId && roomRegistryId && memberRegistryId)) {
      setError("Registries not found");
      return;
    }

    if (name.length < 1 || name.length > 100) {
      setError("Room name must be between 1 and 100 characters");
      return;
    }

    if (description.length > 500) {
      setError("Description must be less than 500 characters");
      return;
    }

    setError("");

    const tx = new Transaction();

    tx.moveCall({
      arguments: [
        tx.object(profileRegistryId),
        tx.object(roomRegistryId),
        tx.object(memberRegistryId),
        tx.pure.string(name),
        tx.pure.string(description),
        tx.object("0x6"), // Clock shared object ID
      ],
      target: `${chatPackageId}::chat::create_room`,
    });

    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: async ({ digest }) => {
          const { effects } = await suiClient.waitForTransaction({
            digest,
            options: {
              showEffects: true,
              showEvents: true,
            },
          });

          // Tìm room ID từ created objects hoặc events
          const roomId = effects?.created?.[0]?.reference?.objectId;
          if (roomId && onCreated) {
            onCreated(roomId);
          }
          setName("");
          setDescription("");
        },
        onError: (err) => {
          setError(err.message || "Failed to create room");
        },
      }
    );
  }

  if (!currentAccount) {
    return <Text>Please connect your wallet</Text>;
  }

  return (
    <Container>
      <Flex direction="column" gap="3">
        <TextField.Root
          disabled={isSuccess || isPending}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          placeholder="Room name (1-100 characters)"
          value={name}
        />
        <TextArea
          disabled={isSuccess || isPending}
          onChange={(e) => {
            setDescription(e.target.value);
            setError("");
          }}
          placeholder="Room description (optional, max 500 characters)"
          rows={3}
          value={description}
        />
        {error && <Text color="red">{error}</Text>}
        <Button
          disabled={
            isSuccess ||
            isPending ||
            !profileRegistryId ||
            !roomRegistryId ||
            !memberRegistryId ||
            !name.trim()
          }
          onClick={() => {
            create();
          }}
          size="3"
        >
          {isSuccess || isPending ? <ClipLoader size={20} /> : "Create Room"}
        </Button>
      </Flex>
    </Container>
  );
}
