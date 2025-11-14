import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { Card, Flex, Heading, Text } from "@radix-ui/themes";
import { useNetworkVariable } from "./networkConfig";
import { UpdateUsername } from "./UpdateUsername";

export function ProfileView() {
  const chatPackageId = useNetworkVariable("chatPackageId");
  const currentAccount = useCurrentAccount();

  // Query user's profile
  const {
    data: profileData,
    isPending,
    error,
    refetch,
  } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: currentAccount?.address || "",
      filter: {
        StructType: `${chatPackageId}::chat::UserProfile`,
      },
      options: {
        showContent: true,
        showOwner: true,
      },
    },
    {
      enabled:
        !!currentAccount?.address &&
        !!chatPackageId &&
        chatPackageId !== "0xTODO",
      refetchInterval: 5000, // Auto-refresh every 5 seconds
    }
  );

  if (!currentAccount) {
    return <Text>Please connect your wallet to view your profile</Text>;
  }

  if (isPending) {
    return <Text>Loading profile...</Text>;
  }

  if (error) {
    return <Text color="red">Error loading profile: {error.message}</Text>;
  }

  const profileObj = profileData?.data?.[0];
  if (!profileObj?.data || profileObj.data.content?.dataType !== "moveObject") {
    return null; // Don't display anything if no profile exists
  }

  const fields = profileObj.data.content.fields as {
    id: { id: string };
    owner: string;
    username: string;
    created_at: string;
    updated_at: string;
  };

  const createdDate = new Date(Number(fields.created_at)).toLocaleString();
  const updatedDate = new Date(Number(fields.updated_at)).toLocaleString();

  return (
    <Card style={{ padding: "1.5rem" }}>
      <Flex direction="column" gap="4">
        <Heading size="5">Your Profile</Heading>
        <Flex direction="column" gap="2">
          <Text>
            <strong>Username:</strong> {fields.username}
          </Text>
          <Text color="gray" size="2">
            <strong>Address:</strong> {fields.owner}
          </Text>
          <Text color="gray" size="2">
            <strong>Created:</strong> {createdDate}
          </Text>
          <Text color="gray" size="2">
            <strong>Updated:</strong> {updatedDate}
          </Text>
        </Flex>
        <Flex direction="column" gap="2">
          <Heading size="4">Update Username</Heading>
          <UpdateUsername
            onUpdated={() => {
              refetch();
            }}
            profileId={fields.id.id}
          />
        </Flex>
      </Flex>
    </Card>
  );
}
