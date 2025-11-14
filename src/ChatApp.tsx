import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { Card, Container, Flex, Heading, Tabs } from "@radix-ui/themes";
import { useState } from "react";
import { CreateProfile } from "./CreateProfile";
import { CreateRoom } from "./CreateRoom";
import { MessageList } from "./MessageList";
import { useNetworkVariable } from "./networkConfig";
import { ProfileView } from "./ProfileView";
import { RoomList } from "./RoomList";
import { SendMessage } from "./SendMessage";

export function ChatApp() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("profile");
  const chatPackageId = useNetworkVariable("chatPackageId");
  const currentAccount = useCurrentAccount();

  // Query user's profile để kiểm tra đã có profile chưa
  const { data: profileData, refetch: refetchProfile } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: currentAccount?.address || "",
      filter: {
        StructType: `${chatPackageId}::chat::UserProfile`,
      },
      options: {
        showContent: true,
      },
    },
    {
      enabled:
        !!currentAccount?.address &&
        !!chatPackageId &&
        chatPackageId !== "0xTODO",
      refetchInterval: 3000, // Auto-refresh every 3 seconds
    }
  );

  const hasProfile = profileData?.data && profileData.data.length > 0;

  const handleRoomSelect = (roomId: string) => {
    setSelectedRoomId(roomId);
    // Tự động chuyển sang tab "Chat" khi chọn room
    setActiveTab("chat");
  };

  const handleMessageSent = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleProfileCreated = () => {
    // Trigger refresh profile data
    refetchProfile();
  };

  return (
    <Container size="4">
      <Flex direction="column" gap="4" style={{ padding: "2rem" }}>
        <Heading size="8">Sui Messenger</Heading>

        <Tabs.Root onValueChange={setActiveTab} value={activeTab}>
          <Tabs.List>
            <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
            <Tabs.Trigger value="rooms">Rooms</Tabs.Trigger>
            <Tabs.Trigger value="chat">Chat</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="profile">
            <Card style={{ padding: "1.5rem", marginTop: "1rem" }}>
              <Flex direction="column" gap="4">
                {!hasProfile && (
                  <>
                    <Heading size="5">Create Profile</Heading>
                    <CreateProfile onCreated={handleProfileCreated} />
                  </>
                )}
                {hasProfile && (
                  <>
                    <Heading size="5">Your Profile</Heading>
                    <ProfileView />
                  </>
                )}
              </Flex>
            </Card>
          </Tabs.Content>

          <Tabs.Content value="rooms">
            <Card style={{ padding: "1.5rem", marginTop: "1rem" }}>
              <Flex direction="column" gap="4">
                <Heading size="5">Create Room</Heading>
                <CreateRoom
                  onCreated={(roomId) => {
                    setSelectedRoomId(roomId);
                  }}
                />
                <Heading size="5" style={{ marginTop: "2rem" }}>
                  Available Rooms
                </Heading>
                <RoomList onRoomSelect={handleRoomSelect} />
              </Flex>
            </Card>
          </Tabs.Content>

          <Tabs.Content value="chat">
            <Card style={{ padding: "1.5rem", marginTop: "1rem" }}>
              <Flex direction="column" gap="4">
                {selectedRoomId ? (
                  <>
                    <Heading size="5">Room Chat</Heading>
                    <MessageList
                      refreshTrigger={refreshTrigger}
                      roomId={selectedRoomId}
                    />
                    <SendMessage
                      onSent={handleMessageSent}
                      roomId={selectedRoomId}
                    />
                  </>
                ) : (
                  <>
                    <Heading size="5">Select a Room</Heading>
                    <RoomList onRoomSelect={handleRoomSelect} />
                  </>
                )}
              </Flex>
            </Card>
          </Tabs.Content>
        </Tabs.Root>
      </Flex>
    </Container>
  );
}
