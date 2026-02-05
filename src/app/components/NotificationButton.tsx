"use client";

import { useState, useEffect, useRef } from "react";
import Button from "./Button";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

// ✅ Toast notification component
function NotificationToast({
  notification,
  onClose,
  onOpen,
  getNotificationStyle,
}: {
  notification: Notif;
  onClose: () => void;
  onOpen: () => void;
  getNotificationStyle: (
    header: string,
    message: string,
  ) => {
    icon: string;
    headerColor: string;
    dotColor: string;
  };
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Give time for fade out animation before calling onClose
      setTimeout(() => {
        onClose();
      }, 300);
    }, 4000);

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  const style = getNotificationStyle(notification.header, notification.message);

  if (!isVisible) return null;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes slideDown {
            from {
              transform: translateY(-100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          
          @keyframes fadeOut {
            from {
              opacity: 1;
            }
            to {
              opacity: 0;
            }
          }
          
          .notification-toast {
            animation: slideDown 0.3s ease-out;
          }
          
          .notification-toast.closing {
            animation: fadeOut 0.3s ease-out;
          }
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
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
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
          {/* Content */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              flex: 1,
            }}
          >
            {/* ✅ Dynamic icon based on notification type */}
            <img src={style.icon} alt="notification icon" />

            <div style={{ flex: 1 }}>
              {/* ✅ Title with dynamic color */}
              <div
                style={{
                  fontWeight: 600,
                  color: style.headerColor,
                  marginBottom: "3px",
                }}
              >
                {notification.header}
              </div>

              {/* ✅ Message with same formatting as dropdown */}
              <div
                style={{
                  fontSize: "12px",
                  color: "rgba(107, 114, 128, 1)",
                  marginBottom: "10px",
                }}
              >
                {(() => {
                  const message = notification.message;
                  const headerLower = notification.header.toLowerCase();

                  // ✅ Special handling for "Payment Rejected" notifications
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
                          <span style={{ color: "rgba(107, 114, 128, 1)" }}>
                            Payment for{" "}
                          </span>
                          <span style={{ color: "#000000" }}>{lpoId}</span>
                          <span style={{ color: "rgba(107, 114, 128, 1)" }}>
                            {" "}
                            has been rejected
                          </span>
                        </>
                      );
                    }

                    return (
                      <span style={{ color: "rgba(107, 114, 128, 1)" }}>
                        {message}
                      </span>
                    );
                  }

                  // ✅ Special handling for "Stock Transferred" notifications
                  if (
                    headerLower.includes("stock") &&
                    headerLower.includes("transferred")
                  ) {
                    const regex =
                      /^(.+?)\s+was transferred from\s+(.+?)\s+to\s+(.+)$/i;
                    const match = message.match(regex);

                    if (match) {
                      const inventoryName = match[1];
                      const from = match[2];
                      const to = match[3];

                      return (
                        <>
                          <span style={{ color: "#000000" }}>
                            {inventoryName}
                          </span>
                          <span style={{ color: "inherit" }}>
                            {" "}
                            was transferred from{" "}
                          </span>
                          <span style={{ color: "#000000" }}>{from}</span>
                          <span style={{ color: "inherit" }}> to </span>
                          <span style={{ color: "#000000" }}>{to}</span>
                        </>
                      );
                    }

                    return <span style={{ color: "inherit" }}>{message}</span>;
                  }

                  // ✅ Special handling for "Stock Issued" notifications
                  if (
                    headerLower.includes("stock") &&
                    headerLower.includes("issued")
                  ) {
                    const regex = /^(.+?)\s+was issued to\s+(.+)$/i;
                    const match = message.match(regex);

                    if (match) {
                      const inventoryName = match[1];
                      const receiverName = match[2];

                      return (
                        <>
                          <span style={{ color: "#000000" }}>
                            {inventoryName}
                          </span>
                          <span style={{ color: "inherit" }}>
                            {" "}
                            was issued to{" "}
                          </span>
                          <span style={{ color: "#000000" }}>
                            {receiverName}
                          </span>
                        </>
                      );
                    }

                    return <span style={{ color: "inherit" }}>{message}</span>;
                  }

                  // ✅ Special handling for "Stock Sent" notifications
                  if (
                    headerLower.includes("stock") &&
                    headerLower.includes("sent")
                  ) {
                    const regex =
                      /^(.+?)\s+was sent for processing\s+\((.+?)\)$/i;
                    const match = message.match(regex);

                    if (match) {
                      const inventoryName = match[1];
                      const purpose = match[2];

                      return (
                        <>
                          <span style={{ color: "#000000" }}>
                            {inventoryName}
                          </span>
                          <span style={{ color: "inherit" }}>
                            {" "}
                            was sent for processing{" "}
                          </span>
                          <span style={{ color: "#000000" }}>({purpose})</span>
                        </>
                      );
                    }

                    return <span style={{ color: "inherit" }}>{message}</span>;
                  }

                  // ✅ Special handling for "BOQ Created" notifications
                  if (
                    headerLower.includes("boq") &&
                    headerLower.includes("created")
                  ) {
                    const regex =
                      /^A new BOQ\s+(.+?)\s+was created for\s+(.+)$/i;
                    const match = message.match(regex);

                    if (match) {
                      const boqName = match[1];
                      const projectName = match[2];

                      return (
                        <>
                          <span style={{ color: "inherit" }}>A new BOQ </span>
                          <span style={{ color: "#000000" }}>{boqName}</span>
                          <span style={{ color: "inherit" }}>
                            {" "}
                            was created for{" "}
                          </span>
                          <span style={{ color: "#000000" }}>
                            {projectName}
                          </span>
                        </>
                      );
                    }

                    return <span style={{ color: "inherit" }}>{message}</span>;
                  }

                  // ✅ Special handling for "BOQ Updated" notifications
                  if (
                    headerLower.includes("boq") &&
                    headerLower.includes("updated")
                  ) {
                    const regex =
                      /^A new BOQ\s+(.+?)\s+was created for\s+(.+)$/i;
                    const match = message.match(regex);

                    if (match) {
                      const boqName = match[1];
                      const projectName = match[2];

                      return (
                        <>
                          <span style={{ color: "inherit" }}>A new BOQ </span>
                          <span style={{ color: "#000000" }}>{boqName}</span>
                          <span style={{ color: "inherit" }}>
                            {" "}
                            was created for{" "}
                          </span>
                          <span style={{ color: "#000000" }}>
                            {projectName}
                          </span>
                        </>
                      );
                    }

                    return <span style={{ color: "inherit" }}>{message}</span>;
                  }

                  // ✅ Special handling for "New Inventory Item" notifications
                  if (
                    headerLower.includes("new") &&
                    headerLower.includes("inventory")
                  ) {
                    const regex = /^(.+?)\s+was created by\s+(.+)$/i;
                    const match = message.match(regex);

                    if (match) {
                      const itemName = match[1];
                      const createdBy = match[2];

                      return (
                        <>
                          <span style={{ color: "#000000" }}>{itemName}</span>
                          <span style={{ color: "inherit" }}>
                            {" "}
                            was created by{" "}
                          </span>
                          <span style={{ color: "#000000" }}>{createdBy}</span>
                        </>
                      );
                    }

                    return <span style={{ color: "inherit" }}>{message}</span>;
                  }

                  // ✅ Special handling for "Stock Added" notifications
                  if (
                    headerLower.includes("stock") &&
                    headerLower.includes("added")
                  ) {
                    const regex = /^(\d+\s+\w+)\s+was added to\s+(.+)$/i;
                    const match = message.match(regex);

                    if (match) {
                      const quantityUnit = match[1];
                      const materialName = match[2];

                      return (
                        <>
                          <span style={{ color: "#000000" }}>
                            {quantityUnit}
                          </span>
                          <span style={{ color: "inherit" }}>
                            {" "}
                            was added to{" "}
                          </span>
                          <span style={{ color: "#000000" }}>
                            {materialName}
                          </span>
                        </>
                      );
                    }

                    return <span style={{ color: "inherit" }}>{message}</span>;
                  }

                  // ✅ Special handling for "Rolled Back MR" notifications
                  if (
                    headerLower.includes("rolled") &&
                    headerLower.includes("back")
                  ) {
                    const regex =
                      /^(Your\s+)?(MR-\d+)\s+was moved to the\s+(.+?)\s+stage$/i;
                    const match = message.match(regex);

                    if (match) {
                      const prefix = match[1] || "";
                      const mrId = match[2];
                      const stageName = match[3];

                      return (
                        <>
                          {prefix && (
                            <span style={{ color: "inherit" }}>{prefix}</span>
                          )}
                          <span style={{ color: "#000000" }}>{mrId}</span>
                          <span style={{ color: "inherit" }}>
                            {" "}
                            was moved to the{" "}
                          </span>
                          <span style={{ color: "#000000" }}>{stageName}</span>
                          <span style={{ color: "inherit" }}> stage</span>
                        </>
                      );
                    }

                    return <span style={{ color: "inherit" }}>{message}</span>;
                  }

                  // ✅ Special handling for "Missing DN" notifications
                  if (
                    headerLower.includes("missing") &&
                    headerLower.includes("dn")
                  ) {
                    const regex =
                      /^Delivery note for (.+?) has been missing for 72hrs!$/i;
                    const match = message.match(regex);

                    if (match) {
                      const description = match[1];

                      return (
                        <>
                          <span style={{ color: "rgba(107, 114, 128, 1)" }}>
                            Delivery note for{" "}
                          </span>
                          <span style={{ color: "#000000" }}>
                            {description}
                          </span>
                          <span style={{ color: "rgba(107, 114, 128, 1)" }}>
                            {" "}
                            has been missing for 72hrs!
                          </span>
                        </>
                      );
                    }

                    return (
                      <span style={{ color: "rgba(107, 114, 128, 1)" }}>
                        {message}
                      </span>
                    );
                  }

                  // ✅ Original handling for other notifications
                  const byIndex = message.toLowerCase().indexOf(" by ");

                  const beforeBy =
                    byIndex !== -1 ? message.slice(0, byIndex + 4) : message;

                  const afterBy =
                    byIndex !== -1 ? message.slice(byIndex + 4) : null;

                  const renderText = (text: string, makeBlack = false) => {
                    const parts = text.split(
                      /(MR-\d+|LPO-\d+|\([^)]*AED[^)]*\))/g,
                    );

                    return parts.map((part, index) => {
                      if (part.startsWith("MR-") || part.startsWith("LPO-")) {
                        return (
                          <span key={index} style={{ color: "#000000" }}>
                            {part}
                          </span>
                        );
                      } else if (
                        part.startsWith("(") &&
                        part.includes("AED") &&
                        part.endsWith(")")
                      ) {
                        return (
                          <span key={index} style={{ color: "#000000" }}>
                            {part}
                          </span>
                        );
                      } else {
                        return (
                          <span
                            key={index}
                            style={{
                              color: makeBlack ? "#000000" : "inherit",
                            }}
                          >
                            {part}
                          </span>
                        );
                      }
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

          {/* ✅ Close button */}
          <button
            onClick={() => {
              onClose();
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "20px",
              color: "#999",
              padding: "0",
              lineHeight: "1",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* ✅ Full-width action button */}
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
            textAlign: "center",
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

  const [notifications, setNotifications] = useState<Notif[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ Toast notification state
  const [toastNotification, setToastNotification] = useState<Notif | null>(
    null,
  );
  const previousNotificationCount = useRef<number>(0);
  const latestNotificationIdRef = useRef<number | null>(null);

  // ✅ Browser notification permission state
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermission>("default");

  // ✅ Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);

      // If permission is default, request it
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  // ✅ Function to show browser notification
  const showBrowserNotification = (notification: Notif) => {
    if ("Notification" in window && Notification.permission === "granted") {
      // Strip HTML and get plain text for browser notification
      const plainTextMessage = notification.message.replace(/<[^>]*>/g, "");

      const browserNotif = new Notification(notification.header, {
        body: plainTextMessage,
        icon: "/icons/notification.svg",
        badge: "/icons/notification.svg",
        tag: `notification-${notification.id}`,
        requireInteraction: false,
      });

      // Handle notification click - navigate to the appropriate page
      browserNotif.onclick = () => {
        window.focus();
        const url = getNotificationUrl(notification);
        router.push(url);
        browserNotif.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        browserNotif.close();
      }, 5000);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Updated polling logic - only polls when tab is visible
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (!interval) {
        fetchNotifications();
        interval = setInterval(() => {
          fetchNotifications();
        }, 5000); // Poll every 5 seconds
      }
    };

    const stopPolling = () => {
      if (interval) {
        console.log("Stopping polling..."); // Debug log
        clearInterval(interval);
        interval = null;
      }
    };

    // Start immediately if tab is already focused
    if (document.visibilityState === "visible") {
      startPolling();
    }

    // Listen for tab focus/blur
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Tab became visible"); // Debug log
        startPolling();
      } else {
        console.log("Tab became hidden"); // Debug log
        stopPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  async function fetchNotifications() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/notification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ department_id: userInfo?.departmentID }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // ✅ Sort notifications by created_at (newest first)
          const sortedNotifications = data.rows.sort((a: Notif, b: Notif) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA; // Newest first
          });

          // ✅ Check if there's a new notification by comparing IDs
          if (
            sortedNotifications.length > 0 &&
            latestNotificationIdRef.current !== null
          ) {
            const newestNotification = sortedNotifications[0];

            // If the newest notification has a different ID than what we last saw
            if (newestNotification.id !== latestNotificationIdRef.current) {
              console.log("New notification detected:", newestNotification); // Debug log

              // Show in-app toast
              setToastNotification(newestNotification);

              // ✅ Show browser notification
              showBrowserNotification(newestNotification);
            }
          }

          // Update the latest notification ID
          if (sortedNotifications.length > 0) {
            latestNotificationIdRef.current = sortedNotifications[0].id;
          }

          // Update the count
          previousNotificationCount.current = sortedNotifications.length;

          setNotifications(sortedNotifications);
        }
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  }

  // ✅ Mark all notifications as read
  async function markAllAsRead() {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/notification/markAllRead`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ department_id: userInfo?.departmentID }),
        },
      );

      if (response.ok) {
        // Update local state to mark all as read
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }

  // ✅ Mark notification as read, then navigate
  async function handleNotificationOpen(
    e: React.MouseEvent,
    notification: Notif,
  ) {
    e.preventDefault(); // Prevent default link behavior

    // Mark as read first
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/notification/markRead`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notification_id: notification.id }),
        },
      );

      if (response.ok) {
        // Update local state to mark this notification as read
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, is_read: true } : n,
          ),
        );
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }

    // Then navigate
    const url = getNotificationUrl(notification);
    router.push(url);
  }

  function getTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  }

  // ✅ Helper function to get notification styling based on header and message
  function getNotificationStyle(header: string, message: string) {
    const headerLower = header.toLowerCase();
    const messageLower = message.toLowerCase();

    // ✅ Check for payment rejected (MUST come before general "rejected" check)
    if (headerLower.includes("payment") && headerLower.includes("rejected")) {
      return {
        icon: paymentCrossIcon,
        headerColor: "rgba(248, 77, 77, 1)",
        dotColor: "rgba(248, 77, 77, 1)",
      };
    }

    // ✅ Check for payment overdue
    if (headerLower.includes("payment") && headerLower.includes("overdue")) {
      return {
        icon: paymentExcalamationIcon,
        headerColor: "rgba(248, 77, 77, 1)",
        dotColor: "rgba(248, 77, 77, 1)",
      };
    }

    // ✅ Check for missing delivery note
    if (headerLower.includes("missing") && headerLower.includes("dn")) {
      return {
        icon: mrExcalamationIcon,
        headerColor: "rgba(248, 77, 77, 1)",
        dotColor: "rgba(248, 77, 77, 1)",
      };
    }

    // ✅ Check for stock transferred (stock transfer icon, black text)
    if (headerLower.includes("stock") && headerLower.includes("transferred")) {
      return {
        icon: stockTransferIcon,
        headerColor: "#000000",
        dotColor: "#000000",
      };
    }

    // ✅ Check for stock issued (stock icon, black text)
    if (headerLower.includes("stock") && headerLower.includes("issued")) {
      return {
        icon: stockIcon,
        headerColor: "#000000",
        dotColor: "#000000",
      };
    }

    // ✅ Check for stock sent (stock icon, black text)
    if (headerLower.includes("stock") && headerLower.includes("sent")) {
      return {
        icon: stockIcon,
        headerColor: "#000000",
        dotColor: "#000000",
      };
    }

    // ✅ Check for BOQ-related notifications (stock icon, black text)
    if (headerLower.includes("boq")) {
      return {
        icon: stockIcon,
        headerColor: "#000000",
        dotColor: "#000000",
      };
    }

    // ✅ Check for new inventory item (stock icon, black text)
    if (headerLower.includes("new") && headerLower.includes("inventory")) {
      return {
        icon: stockIcon,
        headerColor: "#000000",
        dotColor: "#000000",
      };
    }

    // ✅ Check for stock added (green check icon)
    if (headerLower.includes("stock") && headerLower.includes("added")) {
      return {
        icon: stockCheckIcon,
        headerColor: "rgba(1, 161, 92, 1)",
        dotColor: "rgba(1, 161, 92, 1)",
      };
    }

    // ✅ Check for low stock or no stock (red exclamation icon)
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

    // ✅ Check for awaiting delivery
    if (headerLower.includes("awaiting") && headerLower.includes("delivery")) {
      return {
        icon: deliveryIcon,
        headerColor: "#000000",
        dotColor: "#000000",
      };
    }

    // ✅ Check for payment-related notifications (pending payment)
    if (headerLower.includes("pending") && headerLower.includes("payment")) {
      return {
        icon: paymentExcalamationIcon,
        headerColor: "rgba(248, 77, 77, 1)",
        dotColor: "rgba(248, 77, 77, 1)",
      };
    }

    // ✅ Check for payment approved
    if (headerLower.includes("payment") && headerLower.includes("approved")) {
      return {
        icon: paymentCheckIcon,
        headerColor: "rgba(1, 161, 92, 1)",
        dotColor: "rgba(1, 161, 92, 1)",
      };
    }

    // ✅ Check for MR rejected or required (this comes AFTER payment rejected check)
    if (headerLower.includes("rejected") || headerLower.includes("required")) {
      return {
        icon: mrExcalamationIcon,
        headerColor: "rgba(248, 77, 77, 1)",
        dotColor: "rgba(248, 77, 77, 1)",
      };
    }

    // ✅ Check for MR rolled back
    if (headerLower.includes("rolled") && headerLower.includes("back")) {
      return {
        icon: mrRollbackIcon,
        headerColor: "rgba(248, 77, 77, 1)",
        dotColor: "rgba(248, 77, 77, 1)",
      };
    }

    // ✅ Check for MR approved or submitted
    if (headerLower.includes("approved") || headerLower.includes("submitted")) {
      return {
        icon: mrCheckIcon,
        headerColor: "rgba(1, 161, 92, 1)",
        dotColor: "rgba(1, 161, 92, 1)",
      };
    }

    // Default styling
    return {
      icon: mrCheckIcon,
      headerColor: "rgba(1, 161, 92, 1)",
      dotColor: "rgba(1, 161, 92, 1)",
    };
  }

  // ✅ Helper function to determine the redirect URL
  function getNotificationUrl(notification: Notif) {
    const headerLower = notification.header.toLowerCase();

    // ✅ Check if notification is transfer/issue/send related
    if (
      (headerLower.includes("stock") && headerLower.includes("transferred")) ||
      (headerLower.includes("stock") && headerLower.includes("issued")) ||
      (headerLower.includes("stock") && headerLower.includes("sent"))
    ) {
      const transactionId = notification.transfer_id || notification.id;
      return `/inventory?tab=transfer-log&search=TA-${String(transactionId).padStart(5, "0")}`;
    }

    // ✅ Check if notification is BOQ-related
    if (headerLower.includes("boq")) {
      return `/boq/${notification.boq_header_id}`;
    }

    // ✅ Check if notification is stock-related
    if (headerLower.includes("stock") || headerLower.includes("inventory")) {
      return `/inventory/${notification.inventory_item_id}`;
    }

    // ✅ Default to MR page
    return `/mr/${notification.mr_header_id}`;
  }

  // Count unread notifications
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const hasUnread = unreadCount > 0;

  return (
    <>
      {/* ✅ Toast Notification Popup */}
      {toastNotification && (
        <NotificationToast
          notification={toastNotification}
          onClose={() => {
            console.log("Toast onClose called"); // Debug log
            setToastNotification(null);
          }}
          onOpen={() => {
            setToastNotification(null);
            setIsOpen(true);
          }}
          getNotificationStyle={getNotificationStyle}
        />
      )}

      {/* ✅ Dark Overlay */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.25)",
            zIndex: 999,
            transition: "opacity 0.2s ease-in-out",
          }}
          onClick={() => setIsOpen(false)}
        />
      )}

      <div ref={dropdownRef} style={{ position: "relative" }}>
        {/* Bell Icon Button */}
        <Button
          componentType={"button"}
          bgColor={"transparent"}
          borderColor={"transparent"}
          textColor={"black"}
          style={{ padding: "0px", position: "relative" }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <img
            src={notificationIcon}
            alt="notifications"
            style={{ width: "20px" }}
          />

          {/* ✅ Red Dot Indicator (only if there are unread notifications) */}
          {hasUnread && (
            <div
              style={{
                position: "absolute",
                top: "0px",
                right: "0px",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: "rgba(243, 53, 53, 1)",
              }}
            />
          )}
        </Button>

        {/* Dropdown */}
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
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "20px 24px 16px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(239, 239, 239, 1)",
              }}
            >
              <h2>Notifications</h2>

              {/* ✅ Mark all as read button */}
              {hasUnread && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(156, 163, 175, 1)",
                    cursor: "pointer",
                    padding: "4px 8px",
                  }}
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div
              style={{
                maxHeight: "420px",
                overflowY: "auto",
              }}
            >
              {notifications.length > 0 ? (
                notifications.map((notification) => {
                  // ✅ Get styling based on notification header AND message
                  const style = getNotificationStyle(
                    notification.header,
                    notification.message,
                  );

                  return (
                    <div
                      key={notification.id}
                      style={{
                        padding: "16px 24px",
                        borderBottom: "1px solid rgba(239, 239, 239, 1)",
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
                        {/* Content */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "10px",
                          }}
                        >
                          {/* ✅ Dynamic icon based on notification type */}
                          <img src={style.icon} alt="notification icon" />

                          <div>
                            {/* ✅ Title with dynamic color */}
                            <div
                              style={{
                                fontWeight: 600,
                                color: style.headerColor,
                                marginBottom: "3px",
                              }}
                            >
                              {notification.header}
                            </div>

                            <div
                              style={{
                                fontSize: "12px",
                                color: "rgba(107, 114, 128, 1)",
                                marginBottom: "10px",
                              }}
                            >
                              {(() => {
                                const message = notification.message;
                                const headerLower =
                                  notification.header.toLowerCase();

                                // ✅ Special handling for "Payment Rejected" notifications
                                if (
                                  headerLower.includes("payment") &&
                                  headerLower.includes("rejected")
                                ) {
                                  const regex =
                                    /^Payment for (LPO-\d+) was rejected$/i;
                                  const match = message.match(regex);

                                  if (match) {
                                    const lpoId = match[1];

                                    return (
                                      <>
                                        <span
                                          style={{
                                            color: "rgba(107, 114, 128, 1)",
                                          }}
                                        >
                                          Payment for{" "}
                                        </span>
                                        <span
                                          style={{
                                            color: "#000000",
                                          }}
                                        >
                                          {lpoId}
                                        </span>
                                        <span
                                          style={{
                                            color: "rgba(107, 114, 128, 1)",
                                          }}
                                        >
                                          {" "}
                                          has been rejected
                                        </span>
                                      </>
                                    );
                                  }

                                  return (
                                    <span
                                      style={{
                                        color: "rgba(107, 114, 128, 1)",
                                      }}
                                    >
                                      {message}
                                    </span>
                                  );
                                }

                                // ✅ Special handling for "Stock Transferred" notifications
                                if (
                                  headerLower.includes("stock") &&
                                  headerLower.includes("transferred")
                                ) {
                                  const regex =
                                    /^(.+?)\s+was transferred from\s+(.+?)\s+to\s+(.+)$/i;
                                  const match = message.match(regex);

                                  if (match) {
                                    const inventoryName = match[1];
                                    const from = match[2];
                                    const to = match[3];

                                    return (
                                      <>
                                        <span style={{ color: "#000000" }}>
                                          {inventoryName}
                                        </span>
                                        <span style={{ color: "inherit" }}>
                                          {" "}
                                          was transferred from{" "}
                                        </span>
                                        <span style={{ color: "#000000" }}>
                                          {from}
                                        </span>
                                        <span style={{ color: "inherit" }}>
                                          {" "}
                                          to{" "}
                                        </span>
                                        <span style={{ color: "#000000" }}>
                                          {to}
                                        </span>
                                      </>
                                    );
                                  }

                                  return (
                                    <span style={{ color: "inherit" }}>
                                      {message}
                                    </span>
                                  );
                                }

                                // ✅ Special handling for "Stock Issued" notifications
                                if (
                                  headerLower.includes("stock") &&
                                  headerLower.includes("issued")
                                ) {
                                  const regex =
                                    /^(.+?)\s+was issued to\s+(.+)$/i;
                                  const match = message.match(regex);

                                  if (match) {
                                    const inventoryName = match[1];
                                    const receiverName = match[2];

                                    return (
                                      <>
                                        <span style={{ color: "#000000" }}>
                                          {inventoryName}
                                        </span>
                                        <span style={{ color: "inherit" }}>
                                          {" "}
                                          was issued to{" "}
                                        </span>
                                        <span style={{ color: "#000000" }}>
                                          {receiverName}
                                        </span>
                                      </>
                                    );
                                  }

                                  return (
                                    <span style={{ color: "inherit" }}>
                                      {message}
                                    </span>
                                  );
                                }

                                // ✅ Special handling for "Stock Sent" notifications
                                if (
                                  headerLower.includes("stock") &&
                                  headerLower.includes("sent")
                                ) {
                                  const regex =
                                    /^(.+?)\s+was sent for processing\s+\((.+?)\)$/i;
                                  const match = message.match(regex);

                                  if (match) {
                                    const inventoryName = match[1];
                                    const purpose = match[2];

                                    return (
                                      <>
                                        <span style={{ color: "#000000" }}>
                                          {inventoryName}
                                        </span>
                                        <span style={{ color: "inherit" }}>
                                          {" "}
                                          was sent for processing{" "}
                                        </span>
                                        <span style={{ color: "#000000" }}>
                                          ({purpose})
                                        </span>
                                      </>
                                    );
                                  }

                                  return (
                                    <span style={{ color: "inherit" }}>
                                      {message}
                                    </span>
                                  );
                                }

                                // ✅ Special handling for "BOQ Created" notifications
                                if (
                                  headerLower.includes("boq") &&
                                  headerLower.includes("created")
                                ) {
                                  const regex =
                                    /^A new BOQ\s+(.+?)\s+was created for\s+(.+)$/i;
                                  const match = message.match(regex);

                                  if (match) {
                                    const boqName = match[1];
                                    const projectName = match[2];

                                    return (
                                      <>
                                        <span style={{ color: "inherit" }}>
                                          A new BOQ{" "}
                                        </span>
                                        <span style={{ color: "#000000" }}>
                                          {boqName}
                                        </span>
                                        <span style={{ color: "inherit" }}>
                                          {" "}
                                          was created for{" "}
                                        </span>
                                        <span style={{ color: "#000000" }}>
                                          {projectName}
                                        </span>
                                      </>
                                    );
                                  }

                                  return (
                                    <span style={{ color: "inherit" }}>
                                      {message}
                                    </span>
                                  );
                                }

                                // ✅ Special handling for "BOQ Updated" notifications
                                if (
                                  headerLower.includes("boq") &&
                                  headerLower.includes("updated")
                                ) {
                                  const regex =
                                    /^A new BOQ\s+(.+?)\s+was created for\s+(.+)$/i;
                                  const match = message.match(regex);

                                  if (match) {
                                    const boqName = match[1];
                                    const projectName = match[2];

                                    return (
                                      <>
                                        <span style={{ color: "inherit" }}>
                                          A new BOQ{" "}
                                        </span>
                                        <span style={{ color: "#000000" }}>
                                          {boqName}
                                        </span>
                                        <span style={{ color: "inherit" }}>
                                          {" "}
                                          was created for{" "}
                                        </span>
                                        <span style={{ color: "#000000" }}>
                                          {projectName}
                                        </span>
                                      </>
                                    );
                                  }

                                  return (
                                    <span style={{ color: "inherit" }}>
                                      {message}
                                    </span>
                                  );
                                }

                                // ✅ Special handling for "New Inventory Item" notifications
                                if (
                                  headerLower.includes("new") &&
                                  headerLower.includes("inventory")
                                ) {
                                  const regex =
                                    /^(.+?)\s+was created by\s+(.+)$/i;
                                  const match = message.match(regex);

                                  if (match) {
                                    const itemName = match[1];
                                    const createdBy = match[2];

                                    return (
                                      <>
                                        <span style={{ color: "#000000" }}>
                                          {itemName}
                                        </span>
                                        <span style={{ color: "inherit" }}>
                                          {" "}
                                          was created by{" "}
                                        </span>
                                        <span style={{ color: "#000000" }}>
                                          {createdBy}
                                        </span>
                                      </>
                                    );
                                  }

                                  return (
                                    <span style={{ color: "inherit" }}>
                                      {message}
                                    </span>
                                  );
                                }

                                // ✅ Special handling for "Stock Added" notifications
                                if (
                                  headerLower.includes("stock") &&
                                  headerLower.includes("added")
                                ) {
                                  const regex =
                                    /^(\d+\s+\w+)\s+was added to\s+(.+)$/i;
                                  const match = message.match(regex);

                                  if (match) {
                                    const quantityUnit = match[1];
                                    const materialName = match[2];

                                    return (
                                      <>
                                        <span style={{ color: "#000000" }}>
                                          {quantityUnit}
                                        </span>
                                        <span style={{ color: "inherit" }}>
                                          {" "}
                                          was added to{" "}
                                        </span>
                                        <span style={{ color: "#000000" }}>
                                          {materialName}
                                        </span>
                                      </>
                                    );
                                  }

                                  return (
                                    <span style={{ color: "inherit" }}>
                                      {message}
                                    </span>
                                  );
                                }

                                // ✅ Special handling for "Rolled Back MR" notifications
                                if (
                                  headerLower.includes("rolled") &&
                                  headerLower.includes("back")
                                ) {
                                  const regex =
                                    /^(Your\s+)?(MR-\d+)\s+was moved to the\s+(.+?)\s+stage$/i;
                                  const match = message.match(regex);

                                  if (match) {
                                    const prefix = match[1] || "";
                                    const mrId = match[2];
                                    const stageName = match[3];

                                    return (
                                      <>
                                        {prefix && (
                                          <span style={{ color: "inherit" }}>
                                            {prefix}
                                          </span>
                                        )}
                                        <span style={{ color: "#000000" }}>
                                          {mrId}
                                        </span>
                                        <span style={{ color: "inherit" }}>
                                          {" "}
                                          was moved to the{" "}
                                        </span>
                                        <span style={{ color: "#000000" }}>
                                          {stageName}
                                        </span>
                                        <span style={{ color: "inherit" }}>
                                          {" "}
                                          stage
                                        </span>
                                      </>
                                    );
                                  }

                                  return (
                                    <span style={{ color: "inherit" }}>
                                      {message}
                                    </span>
                                  );
                                }

                                // ✅ Special handling for "Missing DN" notifications
                                if (
                                  headerLower.includes("missing") &&
                                  headerLower.includes("dn")
                                ) {
                                  const regex =
                                    /^Delivery note for (.+?) has been missing for 72hrs!$/i;
                                  const match = message.match(regex);

                                  if (match) {
                                    const description = match[1];

                                    return (
                                      <>
                                        <span
                                          style={{
                                            color: "rgba(107, 114, 128, 1)",
                                          }}
                                        >
                                          Delivery note for{" "}
                                        </span>
                                        <span
                                          style={{
                                            color: "#000000",
                                          }}
                                        >
                                          {description}
                                        </span>
                                        <span
                                          style={{
                                            color: "rgba(107, 114, 128, 1)",
                                          }}
                                        >
                                          {" "}
                                          has been missing for 72hrs!
                                        </span>
                                      </>
                                    );
                                  }

                                  return (
                                    <span
                                      style={{
                                        color: "rgba(107, 114, 128, 1)",
                                      }}
                                    >
                                      {message}
                                    </span>
                                  );
                                }

                                // ✅ Original handling for other notifications
                                const byIndex = message
                                  .toLowerCase()
                                  .indexOf(" by ");

                                const beforeBy =
                                  byIndex !== -1
                                    ? message.slice(0, byIndex + 4)
                                    : message;

                                const afterBy =
                                  byIndex !== -1
                                    ? message.slice(byIndex + 4)
                                    : null;

                                const renderText = (
                                  text: string,
                                  makeBlack = false,
                                ) => {
                                  const parts = text.split(
                                    /(MR-\d+|LPO-\d+|\([^)]*AED[^)]*\))/g,
                                  );

                                  return parts.map((part, index) => {
                                    if (
                                      part.startsWith("MR-") ||
                                      part.startsWith("LPO-")
                                    ) {
                                      return (
                                        <span
                                          key={index}
                                          style={{ color: "#000000" }}
                                        >
                                          {part}
                                        </span>
                                      );
                                    } else if (
                                      part.startsWith("(") &&
                                      part.includes("AED") &&
                                      part.endsWith(")")
                                    ) {
                                      return (
                                        <span
                                          key={index}
                                          style={{ color: "#000000" }}
                                        >
                                          {part}
                                        </span>
                                      );
                                    } else {
                                      return (
                                        <span
                                          key={index}
                                          style={{
                                            color: makeBlack
                                              ? "#000000"
                                              : "inherit",
                                          }}
                                        >
                                          {part}
                                        </span>
                                      );
                                    }
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

                            <div
                              style={{
                                color: "rgba(107, 114, 128, 1)",
                                marginBottom: "10px",
                              }}
                            >
                              {getTimeAgo(notification.created_at)} ago
                            </div>

                            {/* ✅ OPEN button now uses regular button with onClick */}
                            <Button
                              componentType={"button"}
                              bgColor={"black"}
                              borderColor={"black"}
                              textColor={"white"}
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

                        {/* ✅ Unread dot indicator with dynamic color */}
                        {!notification.is_read && (
                          <div
                            style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              backgroundColor: style.dotColor,
                              flexShrink: 0,
                              marginTop: "6px",
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    padding: "60px 24px",
                    textAlign: "center",
                    color: "rgba(156, 163, 175, 1)",
                  }}
                >
                  <div style={{ fontSize: "16px", fontWeight: "500" }}>
                    No notifications yet
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      marginTop: "8px",
                    }}
                  >
                    We'll notify you when something arrives
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
