import {
  useCurrentAccount,
  useSuiClient,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import type { SuiEvent, SuiObjectResponse } from "@mysten/sui/client";
import { Card, Flex, Heading, Text } from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNetworkVariable } from "./networkConfig";

interface MessageListProps {
  roomId: string;
  refreshTrigger?: number;
}

export function MessageList({ roomId, refreshTrigger }: MessageListProps) {
  const chatPackageId = useNetworkVariable("chatPackageId");
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [usernames, setUsernames] = useState<Record<string, string>>({});

  // Query MessageSent events để lấy danh sách message IDs
  const {
    data: eventsData,
    isPending,
    error,
    refetch,
  } = useSuiClientQuery(
    "queryEvents",
    {
      query: {
        MoveEventType: `${chatPackageId}::chat::MessageSent`,
      },
      limit: 1000,
      order: "descending",
    },
    {
      enabled: !!chatPackageId && chatPackageId !== "0xTODO" && !!roomId,
    }
  );

  // Extract message IDs from events và filter theo roomId
  const messageIds =
    eventsData?.data
      ?.map((event: SuiEvent) => {
        const parsed = event.parsedJson as {
          message_id: string;
          room_id: string;
        };
        // Chỉ lấy messages của room này
        if (parsed.room_id === roomId) {
          return parsed.message_id;
        }
        return null;
      })
      .filter((id: string | null): id is string => id !== null) || [];

  // Query Message objects by IDs
  const { data: messagesData } = useQuery({
    queryKey: ["messages", chatPackageId, roomId, messageIds, refreshTrigger],
    queryFn: async () => {
      if (
        !chatPackageId ||
        chatPackageId === "0xTODO" ||
        messageIds.length === 0
      ) {
        return { data: [] };
      }
      // Query từng message object bằng ID
      const messagePromises = messageIds.map((messageId: string) =>
        suiClient.getObject({
          id: messageId,
          options: {
            showContent: true,
            showOwner: true,
          },
        })
      );
      const messages = await Promise.all(messagePromises);
      return { data: messages };
    },
    enabled:
      !!chatPackageId && chatPackageId !== "0xTODO" && messageIds.length > 0,
  });

  useEffect(() => {
    refetch();
  }, [refreshTrigger, refetch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesData]);

  // Fetch usernames for all message authors
  useEffect(() => {
    const fetchUsernames = async () => {
      if (!(messagesData?.data && chatPackageId) || chatPackageId === "0xTODO")
        return;

      const authors = new Set<string>();
      messagesData.data.forEach((msgObj: SuiObjectResponse) => {
        const msgData = msgObj.data;
        if (msgData && msgData.content?.dataType === "moveObject") {
          const fields = msgData.content.fields as { author: string };
          authors.add(fields.author);
        }
      });

      const usernameMap: Record<string, string> = {};

      for (const author of authors) {
        try {
          const profileResponse = await suiClient.getOwnedObjects({
            owner: author,
            filter: {
              StructType: `${chatPackageId}::chat::UserProfile`,
            },
            options: {
              showContent: true,
            },
          });

          const profileObj = profileResponse.data?.[0];
          if (profileObj?.data?.content?.dataType === "moveObject") {
            const fields = profileObj.data.content.fields as {
              username: string;
            };
            usernameMap[author] = fields.username;
          } else {
            usernameMap[author] = `${author.slice(0, 6)}...${author.slice(-4)}`;
          }
        } catch {
          usernameMap[author] = `${author.slice(0, 6)}...${author.slice(-4)}`;
        }
      }

      setUsernames(usernameMap);
    };

    fetchUsernames();
  }, [messagesData, chatPackageId, suiClient]);

  if (isPending) {
    return <Text>Loading messages...</Text>;
  }

  if (error) {
    return <Text color="red">Error loading messages: {error.message}</Text>;
  }

  // Sort messages by created_at
  const roomMessages = (messagesData?.data || [])
    .filter((msgObj: SuiObjectResponse) => {
      const msgData = msgObj.data;
      return msgData && msgData.content?.dataType === "moveObject";
    })
    .sort((a: SuiObjectResponse, b: SuiObjectResponse) => {
      const aData = a.data;
      const bData = b.data;
      if (
        !(aData && bData) ||
        aData.content?.dataType !== "moveObject" ||
        bData.content?.dataType !== "moveObject"
      ) {
        return 0;
      }
      const aFields = aData.content.fields as { created_at: string };
      const bFields = bData.content.fields as { created_at: string };
      return Number(aFields.created_at) - Number(bFields.created_at);
    });

  if (roomMessages.length === 0) {
    return <Text>No messages yet. Be the first to send one!</Text>;
  }

  return (
    <Flex
      direction="column"
      gap="2"
      style={{ maxHeight: "600px", overflowY: "auto" }}
    >
      <Heading size="4">Messages ({roomMessages.length})</Heading>
      {roomMessages.map((msgObj: SuiObjectResponse) => {
        const msgData = msgObj.data;
        if (!msgData || msgData.content?.dataType !== "moveObject") {
          return null;
        }

        const fields = msgData.content.fields as {
          id: { id: string };
          room_id: { id: string };
          author: string;
          content: string;
          created_at: string;
        };

        const isOwnMessage = fields.author === currentAccount?.address;
        const timestamp = new Date(Number(fields.created_at)).toLocaleString();
        const displayName =
          usernames[fields.author] ||
          `${fields.author.slice(0, 6)}...${fields.author.slice(-4)}`;

        return (
          <Card
            key={fields.id.id}
            style={{
              padding: "0.75rem",
              alignSelf: isOwnMessage ? "flex-end" : "flex-start",
              maxWidth: "70%",
              backgroundColor: isOwnMessage
                ? "var(--accent-3)"
                : "var(--gray-3)",
            }}
          >
            <Flex direction="column" gap="1">
              <Text color="gray" size="1">
                <strong>{displayName}</strong> • {timestamp}
              </Text>
              <Text>{fields.content}</Text>
            </Flex>
          </Card>
        );
      })}
      <div ref={messagesEndRef} />
    </Flex>
  );
}
