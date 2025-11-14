import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Button, Container, Flex, Text, TextField } from "@radix-ui/themes";
import { useState } from "react";
import ClipLoader from "react-spinners/ClipLoader";
import { useProfileRegistry } from "./hooks/useChatRegistry";
import { useNetworkVariable } from "./networkConfig";

export function CreateProfile({
  onCreated,
}: {
  onCreated?: (id: string) => void;
}) {
  const chatPackageId = useNetworkVariable("chatPackageId");
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { data: registryData } = useProfileRegistry();
  const {
    mutate: signAndExecute,
    isSuccess,
    isPending,
  } = useSignAndExecuteTransaction();

  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  // Tìm ProfileRegistry object ID
  const profileRegistryId = registryData?.data?.[0]?.data?.objectId;

  function create() {
    if (!profileRegistryId) {
      setError("Profile registry not found");
      return;
    }

    if (username.length < 3 || username.length > 50) {
      setError("Username must be between 3 and 50 characters");
      return;
    }

    setError("");

    const tx = new Transaction();

    tx.moveCall({
      arguments: [
        tx.object(profileRegistryId),
        tx.pure.string(username),
        tx.object("0x6"), // Clock shared object ID
      ],
      target: `${chatPackageId}::chat::create_profile`,
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

          // Tìm profile ID từ created objects
          const profileId = effects?.created?.[0]?.reference?.objectId;
          setUsername("");

          // Luôn gọi callback để refresh UI
          if (onCreated) {
            onCreated(profileId || "");
          }
        },
        onError: (err) => {
          setError(err.message || "Failed to create profile");
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
            setUsername(e.target.value);
            setError("");
          }}
          placeholder="Enter username (3-50 characters)"
          value={username}
        />
        {error && <Text color="red">{error}</Text>}
        <Button
          disabled={
            isSuccess || isPending || !profileRegistryId || !username.trim()
          }
          onClick={() => {
            create();
          }}
          size="3"
        >
          {isSuccess || isPending ? <ClipLoader size={20} /> : "Create Profile"}
        </Button>
      </Flex>
    </Container>
  );
}
