import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { useNetworkVariable } from "../networkConfig";

export function useRoomMembership(roomId: string) {
  const currentAccount = useCurrentAccount();
  const chatPackageId = useNetworkVariable("chatPackageId");

  // Query events để check xem user đã join room chưa
  const { data: joinEvents } = useSuiClientQuery(
    "queryEvents",
    {
      query: {
        MoveEventType: `${chatPackageId}::chat::UserJoinedRoom`,
      },
      limit: 1000,
      order: "descending",
    },
    {
      enabled:
        !!chatPackageId &&
        chatPackageId !== "0xTODO" &&
        !!currentAccount?.address,
    }
  );

  const { data: leaveEvents } = useSuiClientQuery(
    "queryEvents",
    {
      query: {
        MoveEventType: `${chatPackageId}::chat::UserLeftRoom`,
      },
      limit: 1000,
      order: "descending",
    },
    {
      enabled:
        !!chatPackageId &&
        chatPackageId !== "0xTODO" &&
        !!currentAccount?.address,
    }
  );

  if (!(currentAccount?.address && joinEvents && leaveEvents)) {
    return false;
  }

  // Đếm số lần join và leave
  const joinCount =
    joinEvents.data?.filter(
      (event) =>
        event.parsedJson?.room_id === roomId &&
        event.parsedJson?.user === currentAccount.address
    ).length || 0;

  const leaveCount =
    leaveEvents.data?.filter(
      (event) =>
        event.parsedJson?.room_id === roomId &&
        event.parsedJson?.user === currentAccount.address
    ).length || 0;

  // Nếu số lần join > số lần leave thì user đang là member
  return joinCount > leaveCount;
}
