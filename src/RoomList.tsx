import { useSuiClient, useSuiClientQuery } from "@mysten/dapp-kit";
import type { SuiEvent, SuiObjectResponse } from "@mysten/sui/client";
import { Button, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { useRoomMembership } from "./hooks/useRoomMembership";
import { JoinRoom } from "./JoinRoom";
import { LeaveRoom } from "./LeaveRoom";
import { useNetworkVariable } from "./networkConfig";

type RoomListProps = {
  onRoomSelect?: (roomId: string) => void;
};

export function RoomList({ onRoomSelect }: RoomListProps) {
  const chatPackageId = useNetworkVariable("chatPackageId");
  const suiClient = useSuiClient();

  // Query RoomCreated events để lấy danh sách room IDs
  const { data: roomEventsData } = useSuiClientQuery(
    "queryEvents",
    {
      query: {
        MoveEventType: `${chatPackageId}::chat::RoomCreated`,
      },
      limit: 1000,
      order: "descending",
    },
    {
      enabled: !!chatPackageId && chatPackageId !== "0xTODO",
    }
  );

  // Extract room IDs from events
  const roomIds =
    roomEventsData?.data?.map((event: SuiEvent) => {
      const parsed = event.parsedJson as { room_id: string };
      return parsed.room_id;
    }) || [];

  // Query Room objects by IDs
  const {
    data: roomsData,
    isPending,
    error,
    refetch,
  } = useQuery({
    queryKey: ["rooms", chatPackageId, roomIds],
    queryFn: async () => {
      if (
        !chatPackageId ||
        chatPackageId === "0xTODO" ||
        roomIds.length === 0
      ) {
        return { data: [] };
      }
      // Query each room object by ID
      const roomPromises = roomIds.map((roomId: string) =>
        suiClient.getObject({
          id: roomId,
          options: {
            showContent: true,
            showOwner: true,
          },
        })
      );
      const rooms = await Promise.all(roomPromises);
      return { data: rooms };
    },
    enabled:
      !!chatPackageId && chatPackageId !== "0xTODO" && roomIds.length > 0,
  });

  if (isPending) {
    return <Text>Loading rooms...</Text>;
  }

  if (error) {
    return <Text color="red">Error loading rooms: {error.message}</Text>;
  }

  const rooms = roomsData?.data || [];

  if (rooms.length === 0) {
    return <Text>No rooms found. Create one to get started!</Text>;
  }

  return (
    <Flex direction="column" gap="3">
      <Heading size="4">Chat Rooms ({rooms.length})</Heading>
      {rooms.map((roomObj: SuiObjectResponse) => {
        const roomData = roomObj.data;
        if (!roomData || roomData.content?.dataType !== "moveObject") {
          return null;
        }

        const fields = roomData.content.fields as {
          id: { id: string };
          name: string;
          description: string;
          creator: string;
          created_at: string;
          updated_at: string;
          member_count: string;
        };

        const roomId = fields.id.id;
        return (
          <RoomItem
            fields={fields}
            key={roomId}
            onRefetch={refetch}
            onRoomSelect={onRoomSelect}
            roomId={roomId}
          />
        );
      })}
    </Flex>
  );
}

function RoomItem({
  roomId,
  fields,
  onRoomSelect,
  onRefetch,
}: {
  roomId: string;
  fields: {
    id: { id: string };
    name: string;
    description: string;
    creator: string;
    created_at: string;
    updated_at: string;
    member_count: string;
  };
  onRoomSelect?: (roomId: string) => void;
  onRefetch: () => void;
}) {
  const isMember = useRoomMembership(roomId);

  return (
    <Card style={{ padding: "1rem" }}>
      <Flex direction="column" gap="2">
        <Flex align="center" direction="row" justify="between">
          <Heading size="3">{fields.name}</Heading>
          {isMember ? (
            <LeaveRoom
              onLeft={() => {
                onRefetch();
              }}
              roomId={roomId}
            />
          ) : (
            <JoinRoom
              onJoined={() => {
                onRefetch();
              }}
              roomId={roomId}
            />
          )}
        </Flex>
        {fields.description && (
          <Text color="gray" size="2">
            {fields.description}
          </Text>
        )}
        <Flex direction="row" gap="3">
          <Text size="2">Members: {fields.member_count}</Text>
          <Text size="2">Creator: {fields.creator.slice(0, 8)}...</Text>
        </Flex>
        {onRoomSelect && (
          <Button
            onClick={() => {
              onRoomSelect(roomId);
            }}
            size="2"
          >
            Open Room
          </Button>
        )}
      </Flex>
    </Card>
  );
}
