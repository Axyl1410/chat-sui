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

export function UpdateUsername({
  profileId,
  onUpdated,
}: {
  profileId: string;
  onUpdated?: () => void;
}) {
  const chatPackageId = useNetworkVariable("chatPackageId");
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const { data: profileRegistryData } = useProfileRegistry();
  const {
    mutate: signAndExecute,
    isSuccess,
    isPending,
  } = useSignAndExecuteTransaction();

  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState("");

  const profileRegistryId = profileRegistryData?.data?.[0]?.data?.objectId;

  function update() {
    if (!profileRegistryId) {
      setError("Profile registry not found");
      return;
    }

    if (newUsername.length < 3 || newUsername.length > 50) {
      setError("Username must be between 3 and 50 characters");
      return;
    }

    setError("");

    const tx = new Transaction();

    tx.moveCall({
      arguments: [
        tx.object(profileRegistryId), // ProfileRegistry
        tx.object(profileId), // UserProfile object
        tx.pure.string(newUsername),
        tx.object("0x6"), // Clock shared object ID
      ],
      target: `${chatPackageId}::chat::update_username`,
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

          setNewUsername("");
          if (onUpdated) {
            onUpdated();
          }
        },
        onError: (err) => {
          setError(err.message || "Failed to update username");
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
            setNewUsername(e.target.value);
            setError("");
          }}
          placeholder="Enter new username (3-50 characters)"
          value={newUsername}
        />
        {error && <Text color="red">{error}</Text>}
        <Button
          disabled={
            isSuccess || isPending || !newUsername.trim() || !profileRegistryId
          }
          onClick={() => {
            update();
          }}
          size="3"
        >
          {isSuccess || isPending ? (
            <ClipLoader size={20} />
          ) : (
            "Update Username"
          )}
        </Button>
      </Flex>
    </Container>
  );
}
