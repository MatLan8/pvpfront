import { useEffect, useMemo, useRef, useState } from "react";
import { startConnection } from "../../services/signalr";
import styles from "./GameChat.module.css";

type ChatMessage = {
  playerId: string;
  nickname: string;
  message: string;
  sentAtUtc: string;
};

type GameChatProps = {
  sessionCode: string;
  playerId: string;
};

export default function GameChat({ sessionCode, playerId }: GameChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const storageKey = useMemo(
    () => `chatMessages_${sessionCode}`,
    [sessionCode],
  );

  const buildMessageKey = (msg: ChatMessage) =>
    `${msg.playerId}-${msg.sentAtUtc}-${msg.message}`;

  const mergeMessages = (existing: ChatMessage[], incoming: ChatMessage[]) => {
    const map = new Map<string, ChatMessage>();

    for (const msg of existing) {
      map.set(buildMessageKey(msg), msg);
    }

    for (const msg of incoming) {
      map.set(buildMessageKey(msg), msg);
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(a.sentAtUtc).getTime() - new Date(b.sentAtUtc).getTime(),
    );
  };

  useEffect(() => {
    const storedMessages = sessionStorage.getItem(storageKey);
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    }
  }, [storageKey]);

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      try {
        const connection = await startConnection();

        const handleReceiveChat = (payload: ChatMessage) => {
          if (!isMounted) return;
          setMessages((prev) => mergeMessages(prev, [payload]));
        };

        connection.off("ReceiveChat");
        connection.on("ReceiveChat", handleReceiveChat);

        const history = await connection.invoke<ChatMessage[]>(
          "GetChatHistory",
          sessionCode,
        );

        if (!isMounted) return;

        setMessages((prev) => mergeMessages(prev, history));
      } catch (err) {
        console.error(err);
        if (isMounted) {
          setError("Failed to load chat.");
        }
      }
    };

    setup();

    return () => {
      isMounted = false;
    };
  }, [sessionCode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    try {
      setError("");
      const connection = await startConnection();
      await connection.invoke("SendChat", sessionCode, trimmed);
      setInput("");
    } catch (err) {
      console.error(err);
      setError("Failed to send message.");
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      await sendMessage();
    }
  };

  const formatTime = (utcString: string) => {
    const date = new Date(utcString);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={styles.box}>
      <div className={styles.label}>
        <h5 className={styles.blinkSmooth}>⬤</h5>
        <h5 className={styles.header}>Chat</h5>

      </div>
      <div className={styles.line}></div>

      <div className={styles.messages}>
        {messages.length === 0 ? (
          <p className={styles.empty}>No messages yet.</p>
        ) : (
          messages.map((msg, index) => {
            const prev = index > 0 ? messages[index - 1] : null;
            const next =
              index < messages.length - 1 ? messages[index + 1] : null;

            const isOwnMessage = msg.playerId === playerId;
            const startsGroup = !prev || prev.playerId !== msg.playerId;
            const endsGroup = !next || next.playerId !== msg.playerId;

            return (
              <div
                key={`${msg.playerId}-${msg.sentAtUtc}-${index}`}
                className={`${styles.messageRow} ${isOwnMessage ? styles.ownRow : styles.otherRow
                  } ${startsGroup ? styles.groupStart : styles.groupMiddle}`}
              >
                <div className={styles.messageContainer}>
                  {startsGroup && (
                    <div className={styles.messageMeta}>
                      <span className={styles.sender}>{msg.nickname}</span>
                      <span className={styles.time}>
                        {formatTime(msg.sentAtUtc)}
                      </span>
                    </div>
                  )}

                  <div
                    className={`${styles.messageBubble} ${isOwnMessage ? styles.ownBubble : styles.otherBubble
                      } ${startsGroup
                        ? isOwnMessage
                          ? styles.ownBubbleStart
                          : styles.otherBubbleStart
                        : ""
                      } ${endsGroup
                        ? isOwnMessage
                          ? styles.ownBubbleEnd
                          : styles.otherBubbleEnd
                        : ""
                      }`}
                  >
                    <div className={styles.messageText}>{msg.message}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputArea}>
        <input
          className={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
        />
        <button className={styles.sendButton} onClick={sendMessage}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 17 14">
            <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576zm6.787-8.201L1.591 6.602l4.339 2.76z" />
          </svg>
        </button>

      </div>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
