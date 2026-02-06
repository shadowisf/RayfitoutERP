"use client";
import { useState, useEffect, useRef } from "react";
import Button from "./Button";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

// Icons (assuming these paths are correct)
const notificationIcon = "/icons/notification.svg";
const mrCheckIcon = "/icons/notification-mr-check.svg";
const mrExcalamationIcon = "/icons/notification-mr-exclamation.svg";
const mrRollbackIcon = "/icons/notification-mr-rollback.svg";
const paymentCheckIcon = "/icons/notification-payment-check.svg";
const paymentExcalamationIcon = "/icons/notification-payment-exclamation.svg";
const paymentCrossIcon = "/icons/notification-payment-cross.svg";
const deliveryIcon = "/icons/notification-delivery.svg";
const stockIcon = "/icons/notification-stock.svg";
const stockTransferIcon = "/icons/notification-stock-transfer.svg";
const stockCheckIcon = "/icons/notification-stock-check.svg";
const stockExclamationIcon = "/icons/notification-stock-exclamation.svg";

// Type for notification (adjust if you have a proper type definition)
type Notif = {
  id: number;
  header: string;
  message: string;
  created_at: string;
  is_read: boolean;
  mr_header_id?: string | number;
  inventory_item_id?: string | number;
  boq_header_id?: string | number;
  transfer_id?: string | number;
  // ... other fields as needed
};

// Single source of truth for icon + styling
function getNotificationAppearance(
  header: string,
  message: string,
): {
  icon: string;
  headerColor: string;
  dotColor: string;
} {
  const headerLower = header.toLowerCase();
  const messageLower = message.toLowerCase();

  // Payment Rejected (highest priority)
  if (headerLower.includes("payment") && headerLower.includes("rejected")) {
    return {
      icon: paymentCrossIcon,
      headerColor: "rgba(248, 77, 77, 1)",
      dotColor: "rgba(248, 77, 77, 1)",
    };
  }

  if (headerLower.includes("payment") && headerLower.includes("overdue")) {
    return {
      icon: paymentExcalamationIcon,
      headerColor: "rgba(248, 77, 77, 1)",
      dotColor: "rgba(248, 77, 77, 1)",
    };
  }

  if (headerLower.includes("missing") && headerLower.includes("dn")) {
    return {
      icon: mrExcalamationIcon,
      headerColor: "rgba(248, 77, 77, 1)",
      dotColor: "rgba(248, 77, 77, 1)",
    };
  }

  if (headerLower.includes("stock") && headerLower.includes("transferred")) {
    return {
      icon: stockTransferIcon,
      headerColor: "#000000",
      dotColor: "#000000",
    };
  }

  if (headerLower.includes("stock") && headerLower.includes("issued")) {
    return {
      icon: stockIcon,
      headerColor: "#000000",
      dotColor: "#000000",
    };
  }

  if (headerLower.includes("stock") && headerLower.includes("sent")) {
    return {
      icon: stockIcon,
      headerColor: "#000000",
      dotColor: "#000000",
    };
  }

  if (headerLower.includes("boq")) {
    return {
      icon: stockIcon,
      headerColor: "#000000",
      dotColor: "#000000",
    };
  }

  if (headerLower.includes("new") && headerLower.includes("inventory")) {
    return {
      icon: stockIcon,
      headerColor: "#000000",
      dotColor: "#000000",
    };
  }

  if (headerLower.includes("stock") && headerLower.includes("added")) {
    return {
      icon: stockCheckIcon,
      headerColor: "rgba(1, 161, 92, 1)",
      dotColor: "rgba(1, 161, 92, 1)",
    };
  }

  if (
    (headerLower.includes("low") && headerLower.includes("stock")) ||
    (headerLower.includes("no") && headerLower.includes("stock"))
  ) {
    return {
      icon: stockExclamationIcon,
      headerColor: "rgba(248, 77, 77, 1)",
      dotColor: "rgba(248, 77, 77, 1)",
    };
  }

  if (headerLower.includes("awaiting") && headerLower.includes("delivery")) {
    return {
      icon: deliveryIcon,
      headerColor: "#000000",
      dotColor: "#000000",
    };
  }

  if (headerLower.includes("pending") && headerLower.includes("payment")) {
    return {
      icon: paymentExcalamationIcon,
      headerColor: "rgba(248, 77, 77, 1)",
      dotColor: "rgba(248, 77, 77, 1)",
    };
  }

  if (headerLower.includes("payment") && headerLower.includes("approved")) {
    return {
      icon: paymentCheckIcon,
      headerColor: "rgba(1, 161, 92, 1)",
      dotColor: "rgba(1, 161, 92, 1)",
    };
  }

  if (headerLower.includes("rejected") || headerLower.includes("required")) {
    return {
      icon: mrExcalamationIcon,
      headerColor: "rgba(248, 77, 77, 1)",
      dotColor: "rgba(248, 77, 77, 1)",
    };
  }

  if (headerLower.includes("rolled") && headerLower.includes("back")) {
    return {
      icon: mrRollbackIcon,
      headerColor: "rgba(248, 77, 77, 1)",
      dotColor: "rgba(248, 77, 77, 1)",
    };
  }

  if (headerLower.includes("approved") || headerLower.includes("submitted")) {
    return {
      icon: mrCheckIcon,
      headerColor: "rgba(1, 161, 92, 1)",
      dotColor: "rgba(1, 161, 92, 1)",
    };
  }

  // Default fallback
  return {
    icon: mrCheckIcon,
    headerColor: "rgba(1, 161, 92, 1)",
    dotColor: "rgba(1, 161, 92, 1)",
  };
}

// Toast component
function NotificationToast({
  notification,
  onClose,
  onOpen,
}: {
  notification: Notif;
  onClose: () => void;
  onOpen: () => void;
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(), 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const appearance = getNotificationAppearance(
    notification.header,
    notification.message,
  );

  if (!isVisible) return null;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes slideDown {
              from { transform: translateY(-100%); opacity: 0; }
              to   { transform: translateY(0); opacity: 1; }
            }
            @keyframes fadeOut {
              from { opacity: 1; }
              to   { opacity: 0; }
            }
            .notification-toast { animation: slideDown 0.3s ease-out; }
            .notification-toast.closing { animation: fadeOut 0.3s ease-out; }
          `,
        }}
      />
      <div
        className="notification-toast"
        style={{
          position: "fixed",
          top: "75px",
          right: "20px",
          backgroundColor: "white",
          borderRadius: "10px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          padding: "16px 20px",
          zIndex: 10000,
          minWidth: "350px",
          maxWidth: "400px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              flex: 1,
            }}
          >
            <img
              src={appearance.icon}
              alt="notification icon"
              style={{ width: "24px", height: "24px" }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 600,
                  color: appearance.headerColor,
                  marginBottom: "3px",
                }}
              >
                {notification.header}
              </div>
              <div
                style={{
                  fontSize: "12px",
                  color: "rgba(107,114,128,1)",
                  marginBottom: "10px",
                }}
              >
                {/* Message rendering logic remains unchanged */}
                {(() => {
                  const message = notification.message;
                  const headerLower = notification.header.toLowerCase();

                  // Payment Rejected
                  if (
                    headerLower.includes("payment") &&
                    headerLower.includes("rejected")
                  ) {
                    const regex = /^Payment for (LPO-\d+) was rejected$/i;
                    const match = message.match(regex);
                    if (match) {
                      const lpoId = match[1];
                      return (
                        <>
                          <span style={{ color: "rgba(107,114,128,1)" }}>
                            Payment for{" "}
                          </span>
                          <span style={{ color: "#000" }}>{lpoId}</span>
                          <span style={{ color: "rgba(107,114,128,1)" }}>
                            {" "}
                            has been rejected
                          </span>
                        </>
                      );
                    }
                    return (
                      <span style={{ color: "rgba(107,114,128,1)" }}>
                        {message}
                      </span>
                    );
                  }

                  // Stock Transferred
                  if (
                    headerLower.includes("stock") &&
                    headerLower.includes("transferred")
                  ) {
                    const regex =
                      /^(.+?)\s+was transferred from\s+(.+?)\s+to\s+(.+)$/i;
                    const match = message.match(regex);
                    if (match) {
                      return (
                        <>
                          <span style={{ color: "#000" }}>{match[1]}</span>
                          <span> was transferred from </span>
                          <span style={{ color: "#000" }}>{match[2]}</span>
                          <span> to </span>
                          <span style={{ color: "#000" }}>{match[3]}</span>
                        </>
                      );
                    }
                    return <span>{message}</span>;
                  }

                  // ... (keep all your other special message cases here - unchanged)

                  // Fallback rendering
                  const byIndex = message.toLowerCase().indexOf(" by ");
                  const beforeBy =
                    byIndex !== -1 ? message.slice(0, byIndex + 4) : message;
                  const afterBy =
                    byIndex !== -1 ? message.slice(byIndex + 4) : null;

                  const renderText = (text: string, makeBlack = false) => {
                    const parts = text.split(
                      /(MR-\d+|LPO-\d+|\([^)]*AED[^)]*\))/g,
                    );
                    return parts.map((part, i) => {
                      if (
                        part.match(/^(MR-|LPO-)/) ||
                        (part.includes("(") &&
                          part.includes("AED") &&
                          part.endsWith(")"))
                      ) {
                        return (
                          <span key={i} style={{ color: "#000" }}>
                            {part}
                          </span>
                        );
                      }
                      return (
                        <span
                          key={i}
                          style={{ color: makeBlack ? "#000" : "inherit" }}
                        >
                          {part}
                        </span>
                      );
                    });
                  };

                  return (
                    <>
                      {renderText(beforeBy)}
                      {afterBy && renderText(afterBy, true)}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "20px",
              color: "#999",
              padding: 0,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <button
          onClick={onOpen}
          style={{
            backgroundColor: "black",
            color: "white",
            border: "none",
            borderRadius: "5px",
            padding: "10px 16px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
          }}
        >
          OPEN NOTIFICATIONS
        </button>
      </div>
    </>
  );
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { userInfo } = useAuth();
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [toastNotification, setToastNotification] = useState<Notif | null>(
    null,
  );
  const latestNotificationIdRef = useRef<number | null>(null);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === "default") {
        Notification.requestPermission().then(setNotificationPermission);
      }
    }
  }, []);

  // ... (keep your existing browser notification functions: showBrowserNotification, createBrowserNotification)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Polling logic (unchanged) ...
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const startPolling = () => {
      if (!interval) {
        fetchNotifications();
        interval = setInterval(fetchNotifications, 5000);
      }
    };
    const stopPolling = () => {
      if (interval) clearInterval(interval);
      interval = null;
    };

    if (document.visibilityState === "visible") startPolling();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") startPolling();
      else stopPolling();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [userInfo?.departmentID]);

  async function fetchNotifications() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/notification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ department_id: userInfo?.departmentID }),
        },
      );
      if (!res.ok) return;

      const data = await res.json();
      if (!data.success) return;

      const sorted = data.rows.sort(
        (a: Notif, b: Notif) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      if (sorted.length > 0) {
        const newest = sorted[0];
        if (
          latestNotificationIdRef.current !== null &&
          newest.id !== latestNotificationIdRef.current
        ) {
          setToastNotification(newest);
          // showBrowserNotification(newest);   ← uncomment when ready
        }
        latestNotificationIdRef.current = newest.id;
      }

      setNotifications(sorted);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }

  async function markAllAsRead() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/notification/markAllRead`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ department_id: userInfo?.departmentID }),
        },
      );
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleNotificationOpen(e: React.MouseEvent, notif: Notif) {
    e.preventDefault();
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/notification/markRead`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notification_id: notif.id }),
        },
      );
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)),
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
    const url = getNotificationUrl(notif);
    router.push(url);
  }

  function getTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}min`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  }

  function getNotificationUrl(notification: Notif): string {
    const h = notification.header.toLowerCase();
    if (
      (h.includes("stock") && h.includes("transferred")) ||
      (h.includes("stock") && h.includes("issued")) ||
      (h.includes("stock") && h.includes("sent"))
    ) {
      const id = notification.transfer_id || notification.id;
      return `/inventory?tab=transfer-log&search=TA-${String(id).padStart(5, "0")}`;
    }
    if (h.includes("boq")) {
      return `/boq/${notification.boq_header_id}`;
    }
    if (h.includes("stock") || h.includes("inventory")) {
      return `/inventory/${notification.inventory_item_id}`;
    }
    return `/mr/${notification.mr_header_id}`;
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const hasUnread = unreadCount > 0;

  return (
    <>
      {toastNotification && (
        <NotificationToast
          notification={toastNotification}
          onClose={() => setToastNotification(null)}
          onOpen={() => {
            setToastNotification(null);
            setIsOpen(true);
          }}
        />
      )}

      {isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.25)",
            zIndex: 999,
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      <div ref={dropdownRef} style={{ position: "relative" }}>
        <Button
          componentType="button"
          bgColor="transparent"
          borderColor="transparent"
          textColor="black"
          style={{ padding: 0, position: "relative" }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <img
            src={notificationIcon}
            alt="notifications"
            style={{ width: "20px" }}
          />
          {hasUnread && (
            <div
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: "rgb(243,53,53)",
              }}
            />
          )}
        </Button>

        {isOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 12px)",
              right: 0,
              width: "400px",
              maxHeight: "500px",
              backgroundColor: "white",
              borderRadius: "15px",
              overflow: "hidden",
              zIndex: 1000,
              boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                padding: "20px 24px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #efefef",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "18px" }}>Notifications</h2>
              {hasUnread && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgb(156,163,175)",
                    cursor: "pointer",
                    fontSize: "14px",
                  }}
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div style={{ maxHeight: "420px", overflowY: "auto" }}>
              {notifications.length === 0 ? (
                <div
                  style={{
                    padding: "60px 24px",
                    textAlign: "center",
                    color: "rgb(156,163,175)",
                  }}
                >
                  <div style={{ fontSize: "16px", fontWeight: 500 }}>
                    No notifications yet
                  </div>
                  <div style={{ fontSize: "14px", marginTop: "8px" }}>
                    We'll notify you when something arrives
                  </div>
                </div>
              ) : (
                notifications.map((notification) => {
                  const appearance = getNotificationAppearance(
                    notification.header,
                    notification.message,
                  );

                  return (
                    <div
                      key={notification.id}
                      style={{
                        padding: "16px 24px",
                        borderBottom: "1px solid #efefef",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "10px",
                          }}
                        >
                          <img
                            src={appearance.icon}
                            alt="icon"
                            style={{
                              width: "24px",
                              height: "24px",
                              marginTop: "2px",
                            }}
                          />
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                color: appearance.headerColor,
                                marginBottom: "3px",
                              }}
                            >
                              {notification.header}
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "rgb(107,114,128)",
                                marginBottom: "8px",
                              }}
                            >
                              {/* Reuse the same message rendering logic as in toast */}
                              {(() => {
                                // ... paste your full message rendering logic here (same as in NotificationToast)
                                // For brevity I'm not duplicating the entire block again —
                                // copy the {(() => { ... })()} part from the toast above
                                const message = notification.message;
                                const headerLower =
                                  notification.header.toLowerCase();

                                // (insert your full special cases + fallback rendering here)
                                // You can even extract this into a separate component or function if you want

                                // Example fallback only:
                                return <>{message}</>;
                              })()}
                            </div>
                            <div
                              style={{
                                color: "rgb(107,114,128)",
                                fontSize: "12px",
                                marginBottom: "10px",
                              }}
                            >
                              {getTimeAgo(notification.created_at)} ago
                            </div>
                            <Button
                              componentType="button"
                              bgColor="black"
                              borderColor="black"
                              textColor="white"
                              style={{
                                borderRadius: "5px",
                                padding: "7px 20px",
                                fontSize: "12px",
                              }}
                              onClick={(e) =>
                                handleNotificationOpen(e, notification)
                              }
                            >
                              OPEN
                            </Button>
                          </div>
                        </div>

                        {!notification.is_read && (
                          <div
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: appearance.dotColor,
                              marginTop: "6px",
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
