import {
  useCurrentAccount,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { Card, Container, Flex, Heading, Tabs, Text } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CreateProfile } from "./CreateProfile";
import { CreateRoom } from "./CreateRoom";
import { useRoomMembership } from "./hooks/useRoomMembership";
import { JoinRoom } from "./JoinRoom";
import { LeaveRoom } from "./LeaveRoom";
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
  const suiClient = useSuiClient();

  // Check if user is a member of selected room
  const isMember = useRoomMembership(selectedRoomId || "");

  // Query selected room data
  const { data: selectedRoomData } = useQuery({
    queryKey: ["room", selectedRoomId],
    queryFn: async () => {
      if (!selectedRoomId) return null;
      const roomObj = await suiClient.getObject({
        id: selectedRoomId,
        options: {
          showContent: true,
        },
      });
      return roomObj;
    },
    enabled: !!selectedRoomId,
  });

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

  const handleRoomAction = () => {
    // Trigger refresh after join/leave
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleProfileCreated = () => {
    // Trigger refresh profile data
    refetchProfile();
  };

  // Get room name from selected room data
  const roomName =
    selectedRoomData?.data?.content?.dataType === "moveObject"
      ? (selectedRoomData.data.content.fields as { name: string }).name
      : "Room Chat";

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
                    {/* Room header with name and Leave button */}
                    <Flex align="center" justify="between">
                      <Heading size="5">{roomName}</Heading>
                      {isMember && (
                        <LeaveRoom
                          onLeft={handleRoomAction}
                          roomId={selectedRoomId}
                        />
                      )}
                    </Flex>

                    {/* Show Join button if not a member */}
                    {!isMember && (
                      <Flex
                        align="center"
                        gap="2"
                        justify="center"
                        style={{
                          padding: "1rem",
                          backgroundColor: "var(--orange-3)",
                          borderRadius: "8px",
                        }}
                      >
                        <Text color="orange" size="2">
                          You need to join this room to send messages
                        </Text>
                        <JoinRoom
                          onJoined={handleRoomAction}
                          roomId={selectedRoomId}
                        />
                      </Flex>
                    )}

                    <MessageList
                      refreshTrigger={refreshTrigger}
                      roomId={selectedRoomId}
                    />

                    {/* Only show send message if user is a member */}
                    {isMember ? (
                      <SendMessage
                        onSent={handleMessageSent}
                        roomId={selectedRoomId}
                      />
                    ) : (
                      <Text
                        color="gray"
                        size="2"
                        style={{ textAlign: "center" }}
                      >
                        Join the room to send messages
                      </Text>
                    )}
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
