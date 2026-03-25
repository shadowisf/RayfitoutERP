"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/app/context/AuthContext";
import Button from "./Button";

type Comment = {
  id: number;
  mr_header_id: number;
  author_name: string;
  author_department_id: number;
  author_department_name: string;
  message: string;
  stage_name: string;
  created_at: string;
};

type Department = {
  id: number;
  value: string;
};

// Get first letter of author name for avatar
function getNameLetter(name: string): string {
  return (name || "U").charAt(0).toUpperCase();
}

type CommentsSectionProps = {
  mrHeaderId: number;
  lpoId?: number;
  stageName: string;
};

export default function CommentsSection({
  mrHeaderId,
  lpoId,
  stageName,
}: CommentsSectionProps) {
  const { userInfo } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [message, setMessage] = useState("");
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [isSending, setIsSending] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const commentRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    fetchComments();
    fetchDepartments();
  }, [mrHeaderId, lpoId]);

  async function fetchDepartments() {
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getDepartments" }),
      });
      const data = await res.json();
      setDepartments(data);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  }

  async function fetchComments() {
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getComments",
          mr_header_id: mrHeaderId,
          lpo_id: lpoId || null,
        }),
      });
      const data = await res.json();
      setComments(data);
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  }

  // Extract mentioned department IDs from message
  function extractMentionedDepts(msg: string): number[] {
    const mentionedIds: number[] = [];
    for (const dept of departments) {
      if (msg.includes(`@${dept.value}`)) {
        mentionedIds.push(dept.id);
      }
    }
    return mentionedIds;
  }

  async function handleSend() {
    if (!message.trim() || !userInfo || isSending) return;

    setIsSending(true);
    try {
      const mentionedDeptIds = extractMentionedDepts(message);

      const deptInfo = departments.find((d) => d.id === userInfo.departmentID);

      await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addComment",
          mr_header_id: mrHeaderId,
          lpo_id: lpoId || null,
          author_name: userInfo.name || "Unknown",
          author_department_id: userInfo.departmentID,
          author_department_name:
            deptInfo?.value || userInfo.role || "Department",
          message: message.trim(),
          stage_name: stageName,
          mentioned_department_ids: mentionedDeptIds,
        }),
      });

      setMessage("");
      if (editorRef.current) editorRef.current.innerHTML = "";
      await fetchComments();
    } catch (err) {
      console.error("Error sending comment:", err);
    } finally {
      setIsSending(false);
    }
  }

  // Save and restore cursor position in contentEditable
  function saveCursorPosition(): number {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !editorRef.current) return 0;
    const range = sel.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(editorRef.current);
    preRange.setEnd(range.startContainer, range.startOffset);
    return preRange.toString().length;
  }

  function restoreCursorPosition(pos: number) {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel) return;

    let currentPos = 0;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      const nodeLen = node.textContent?.length || 0;
      if (currentPos + nodeLen >= pos) {
        const range = document.createRange();
        range.setStart(node, pos - currentPos);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      currentPos += nodeLen;
    }
    // If pos is at the very end
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // Re-render contentEditable innerHTML with green mentions
  function updateEditorHighlight() {
    const el = editorRef.current;
    if (!el) return;
    const cursorPos = saveCursorPosition();
    const text = el.textContent || "";
    setMessage(text);

    // Build highlighted HTML
    let html = "";
    let remaining = text;
    while (remaining.length > 0) {
      let earliestIndex = -1;
      let matchedDept: Department | null = null;

      for (const dept of departments) {
        const idx = remaining.indexOf(`@${dept.value}`);
        if (idx !== -1 && (earliestIndex === -1 || idx < earliestIndex)) {
          earliestIndex = idx;
          matchedDept = dept;
        }
      }

      if (earliestIndex === -1 || !matchedDept) {
        html += escapeHtml(remaining);
        break;
      }

      if (earliestIndex > 0) {
        html += escapeHtml(remaining.substring(0, earliestIndex));
      }
      html += `<span style="color: rgba(1, 161, 92, 1); font-weight: 600;">@${escapeHtml(matchedDept.value)}</span>`;
      remaining = remaining.substring(
        earliestIndex + matchedDept.value.length + 1,
      );
    }

    // Only update innerHTML if it actually changed (avoid cursor jump on every keystroke)
    const currentText = el.textContent || "";
    if (currentText === text && el.innerHTML !== html) {
      el.innerHTML = html || "<br>";
      restoreCursorPosition(cursorPos);
    }
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function handleEditorInput() {
    const el = editorRef.current;
    if (!el) return;
    const text = el.textContent || "";
    setMessage(text);

    // Check for mention trigger
    const cursorPos = saveCursorPosition();
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      const charBeforeAt = lastAtIndex > 0 ? text[lastAtIndex - 1] : " ";
      const isCompletedMention = departments.some(
        (d) =>
          text.substring(lastAtIndex) === `@${d.value}` ||
          text.substring(lastAtIndex).startsWith(`@${d.value} `),
      );
      if (
        !isCompletedMention &&
        (charBeforeAt === " " || charBeforeAt === "\n" || lastAtIndex === 0) &&
        !textAfterAt.includes(" ")
      ) {
        setShowMentionDropdown(true);
        setMentionFilter(textAfterAt.toLowerCase());
        setMentionStartIndex(lastAtIndex);
        // Apply highlighting after mention detection
        updateEditorHighlight();
        return;
      }
    }

    setShowMentionDropdown(false);
    setMentionFilter("");
    updateEditorHighlight();
  }

  function handleSelectMention(dept: Department) {
    const el = editorRef.current;
    if (!el) return;
    const text = el.textContent || "";
    const cursorPos = saveCursorPosition();
    const beforeMention = text.substring(0, mentionStartIndex);
    const afterMention = text.substring(cursorPos);
    const newMessage = `${beforeMention}@${dept.value} ${afterMention}`;
    setMessage(newMessage);
    setShowMentionDropdown(false);
    setMentionFilter("");

    // Update innerHTML with highlighting
    let html = "";
    let remaining = newMessage;
    while (remaining.length > 0) {
      let earliestIdx = -1;
      let matched: Department | null = null;
      for (const d of departments) {
        const idx = remaining.indexOf(`@${d.value}`);
        if (idx !== -1 && (earliestIdx === -1 || idx < earliestIdx)) {
          earliestIdx = idx;
          matched = d;
        }
      }
      if (earliestIdx === -1 || !matched) {
        html += escapeHtml(remaining);
        break;
      }
      if (earliestIdx > 0)
        html += escapeHtml(remaining.substring(0, earliestIdx));
      html += `<span style="color: rgba(1, 161, 92, 1); font-weight: 600;">@${escapeHtml(matched.value)}</span>`;
      remaining = remaining.substring(earliestIdx + matched.value.length + 1);
    }
    el.innerHTML = html || "<br>";
    // Place cursor after the inserted mention
    const newCursorPos = mentionStartIndex + dept.value.length + 2; // @name + space
    restoreCursorPosition(newCursorPos);
    el.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && !e.shiftKey && !showMentionDropdown) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") {
      setShowMentionDropdown(false);
    }
  }

  const filteredDepts = departments.filter((d) =>
    d.value.toLowerCase().includes(mentionFilter),
  );

  // Render message with highlighted mentions
  function renderMessage(msg: string) {
    const parts: React.ReactNode[] = [];
    let remaining = msg;
    let key = 0;

    while (remaining.length > 0) {
      let earliestIndex = -1;
      let matchedDept: Department | null = null;

      for (const dept of departments) {
        const idx = remaining.indexOf(`@${dept.value}`);
        if (idx !== -1 && (earliestIndex === -1 || idx < earliestIndex)) {
          earliestIndex = idx;
          matchedDept = dept;
        }
      }

      if (earliestIndex === -1 || !matchedDept) {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }

      if (earliestIndex > 0) {
        parts.push(
          <span key={key++}>{remaining.substring(0, earliestIndex)}</span>,
        );
      }

      parts.push(
        <span
          key={key++}
          style={{
            color: "rgba(1, 161, 92, 1)",
            fontWeight: "600",
          }}
        >
          @{matchedDept.value}
        </span>,
      );

      remaining = remaining.substring(
        earliestIndex + matchedDept.value.length + 1,
      );
    }

    return parts;
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleString("en-US", { month: "short" });
    return `${day} ${month}`;
  }

  return (
    <div style={{ marginTop: "40px" }}>
      <style>{`
        [data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
      `}</style>
      <h2>COMMENTS</h2>

      <br />
      <br />

      {/* Comments list */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {comments.length === 0 && (
          <p style={{ color: "#9ca3af" }}>No comments yet.</p>
        )}

        {/* Single continuous connecting line behind all avatars */}
        {comments.length > 1 && (
          <div
            style={{
              position: "absolute",
              top: "18px",
              left: "18px",
              transform: "translateX(-50%)",
              width: "2px",
              bottom: "18px",
              backgroundColor: "#e5e7eb",
              zIndex: 0,
            }}
          />
        )}

        {comments.map((comment, index) => (
          <div
            key={comment.id}
            ref={(el) => {
              commentRefs.current[index] = el;
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                paddingBottom: "12px",
                paddingTop: index === 0 ? 0 : "16px",
                position: "relative",
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  backgroundColor: "#1a1a1a",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  fontSize: "14px",
                  flexShrink: 0,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {getNameLetter(comment.author_name)}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "5px",
                  }}
                >
                  <span style={{ fontWeight: "600", fontSize: "14px" }}>
                    {comment.author_name} - {comment.author_department_name}
                  </span>
                  <span style={{ color: "#9ca3af", scale: "2" }}>•</span>
                  <span style={{ color: "#9ca3af" }}>
                    {formatDate(comment.created_at)}
                  </span>
                  <span style={{ color: "#9ca3af", scale: "2" }}>•</span>
                  <span
                    style={{
                      color: "#9ca3af",
                      fontStyle: "italic",
                    }}
                  >
                    {comment.stage_name}
                  </span>
                </div>
                <div style={{ fontSize: "14px", lineHeight: "1.5" }}>
                  {renderMessage(comment.message)}
                </div>
              </div>
            </div>
            {/* Border bottom separator */}
            {index < comments.length - 1 && (
              <div
                style={{
                  borderBottom: "1px solid #e5e7eb",
                  marginLeft: "48px",
                }}
              />
            )}
          </div>
        ))}
      </div>

      <br />

      {/* Input area */}
      <div
        style={{
          border: "1px solid rgba(217, 217, 217, 1)",
          borderRadius: "12px",
          padding: "16px",
          position: "relative",
          backgroundColor: "white",
        }}
      >
        <div style={{ position: "relative" }}>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditorInput}
            onKeyDown={handleKeyDown}
            data-placeholder="Write a comment... Use @ to mention a department"
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              lineHeight: "1.5",
              fontFamily: "inherit",
              fontSize: "14px",
              minHeight: "24px",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
            }}
          />

          {/* Mention dropdown */}
          {showMentionDropdown && filteredDepts.length > 0 && (
            <div
              ref={dropdownRef}
              style={{
                position: "absolute",
                bottom: "100%",
                left: 0,
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                padding: "4px",
                zIndex: 10,
                minWidth: "220px",
              }}
            >
              {filteredDepts.map((dept) => (
                <div
                  key={dept.id}
                  onClick={() => handleSelectMention(dept)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderRadius: "6px",
                    fontSize: "14px",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "#f3f4f6")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <span style={{ fontWeight: "500" }}>@{dept.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <span
              style={{ cursor: "pointer", fontSize: "18px", color: "black" }}
              onClick={() => {
                const el = editorRef.current;
                if (el) {
                  const text = el.textContent || "";
                  el.textContent = text + "@";
                  setMessage(text + "@");
                  setShowMentionDropdown(true);
                  setMentionFilter("");
                  setMentionStartIndex(text.length);
                  // Place cursor at end
                  const range = document.createRange();
                  range.selectNodeContents(el);
                  range.collapse(false);
                  const sel = window.getSelection();
                  sel?.removeAllRanges();
                  sel?.addRange(range);
                  el.focus();
                }
              }}
              title="Mention a department"
            >
              @
            </span>
          </div>

          <Button
            componentType={"button"}
            bgColor={"black"}
            borderColor={"black"}
            textColor={"white"}
            disabled={!message.trim() || isSending}
            onClick={handleSend}
          >
            SEND
          </Button>
        </div>
      </div>
    </div>
  );
}
