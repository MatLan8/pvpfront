import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { startConnection } from "../services/signalr";
import { handleReceiveGameToastPayload } from "../services/gameToast";

type UseGameSessionParams = {
  sessionCode?: string;
  nickname: string | null;
  playerId: string | null;
  publicStateStorageKey?: string;
  privateDataStorageKey?: string;
};

type UseGameSessionResult<TPublicState, TPrivateData> = {
  publicState: TPublicState | null;
  privateData: TPrivateData | null;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
};

export function useGameSession<TPublicState, TPrivateData>({
  sessionCode,
  nickname,
  playerId,
  publicStateStorageKey = "publicState",
  privateDataStorageKey = "privateData",
}: UseGameSessionParams): UseGameSessionResult<TPublicState, TPrivateData> {
  const navigate = useNavigate();

  const [publicState, setPublicState] = useState<TPublicState | null>(() => {
    const stored = sessionStorage.getItem(publicStateStorageKey);
    return stored ? JSON.parse(stored) : null;
  });

  const [privateData, setPrivateData] = useState<TPrivateData | null>(() => {
    const stored = sessionStorage.getItem(privateDataStorageKey);
    return stored ? JSON.parse(stored) : null;
  });

  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionCode || !nickname || !playerId) {
      navigate("/");
      return;
    }

    let isMounted = true;

    const setup = async () => {
      try {
        const connection = await startConnection();

        const handlePublicState = (payload: TPublicState) => {
          if (!isMounted) return;

          setPublicState(payload);
          sessionStorage.setItem(
            publicStateStorageKey,
            JSON.stringify(payload),
          );
        };

        const handlePrivateData = (payload: TPrivateData) => {
          if (!isMounted) return;

          setPrivateData(payload);
          sessionStorage.setItem(
            privateDataStorageKey,
            JSON.stringify(payload),
          );
        };

        const handleActionAcknowledged = (payload: {
          success: boolean;
          message: string;
        }) => {
          if (!isMounted) return;
          setError(payload.success ? "" : payload.message);
        };

        const handleGameToast = (payload: unknown) => {
          if (!isMounted) return;
          handleReceiveGameToastPayload(payload, playerId);
        };

        connection.off("ReceivePublicState");
        connection.off("ReceivePrivateData");
        connection.off("ActionAcknowledged");
        connection.off("ReceiveGameToast");
        connection.off("GameCompleted");
        connection.off("GameFailed");

        connection.on("ReceivePublicState", handlePublicState);
        connection.on("ReceivePrivateData", handlePrivateData);
        connection.on("ActionAcknowledged", handleActionAcknowledged);
        connection.on("ReceiveGameToast", handleGameToast);

        connection.onreconnected(async () => {
          try {
            const reconnectedConnection = await startConnection();

            await reconnectedConnection.invoke(
              "JoinSession",
              sessionCode,
              playerId,
              nickname,
            );

            const latestPublicState =
              await reconnectedConnection.invoke<TPublicState>(
                "GetSessionState",
                sessionCode,
              );

            if (!isMounted) return;

            setPublicState(latestPublicState);
            sessionStorage.setItem(
              publicStateStorageKey,
              JSON.stringify(latestPublicState),
            );
          } catch (err) {
            console.error(err);
            if (isMounted) {
              setError("Failed to restore game session after reconnect.");
            }
          }
        });

        await connection.invoke("JoinSession", sessionCode, playerId, nickname);

        const latestPublicState = await connection.invoke<TPublicState>(
          "GetSessionState",
          sessionCode,
        );

        if (!isMounted) return;

        setPublicState(latestPublicState);
        sessionStorage.setItem(
          publicStateStorageKey,
          JSON.stringify(latestPublicState),
        );
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("Failed to load game room.");
        }
      }
    };

    setup();

    return () => {
      isMounted = false;
    };
  }, [
    sessionCode,
    nickname,
    playerId,
    navigate,
    publicStateStorageKey,
    privateDataStorageKey,
  ]);

  return {
    publicState,
    privateData,
    error,
    setError,
  };
}
