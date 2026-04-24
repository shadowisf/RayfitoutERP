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

type CognitoUser = {
  sub: string;
  name: string;
  role: string;
  departmentID: number | null;
};

type Department = {
  id: number;
  value: string;
};

type MentionItem =
  | { kind: "user"; sub: string; name: string; role: string; departmentID: number | null }
  | { kind: "department"; id: number; name: string };

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
  const [users, setUsers] = useState<CognitoUser[]>([]);
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
    fetchUsers();
    fetchDepartments();
  }, [mrHeaderId, lpoId]);

  async function fetchUsers() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/cognito`);
      const data = await res.json();
      if (data.success) setUsers(data.users);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }

  async function fetchDepartments() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "getDepartments" }),
      });
      const data = await res.json();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching departments:", err);
    }
  }

  async function fetchComments() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "getComments",
          mr_header_id: mrHeaderId,
          lpo_id: lpoId || null,
        }),
      });
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  }

  // ── mention extraction ────────────────────────────────────────────────────

  function extractMentions(msg: string): {
    mentioned_users: { cognito_id: string; department_id: number | null }[];
    mentioned_department_ids: number[];
  } {
    const seenUsers = new Set<string>();
    const seenDepts = new Set<number>();
    const mentioned_users: { cognito_id: string; department_id: number | null }[] = [];
    const mentioned_department_ids: number[] = [];

    for (const user of users) {
      if (msg.includes(`@${user.name}`) && !seenUsers.has(user.sub)) {
        seenUsers.add(user.sub);
        mentioned_users.push({ cognito_id: user.sub, department_id: user.departmentID });
      }
    }
    for (const dept of departments) {
      if (msg.includes(`@${dept.value}`) && !seenDepts.has(dept.id)) {
        seenDepts.add(dept.id);
        mentioned_department_ids.push(dept.id);
      }
    }
    return { mentioned_users, mentioned_department_ids };
  }

  async function handleSend() {
    if (!message.trim() || !userInfo || isSending) return;

    setIsSending(true);
    try {
      const { mentioned_users, mentioned_department_ids } = extractMentions(message);
      const deptInfo = departments.find((d) => d.id === userInfo.departmentID);

      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addComment",
          mr_header_id: mrHeaderId,
          lpo_id: lpoId || null,
          author_name: userInfo.name || "Unknown",
          author_department_id: userInfo.departmentID,
          author_department_name: deptInfo?.value || userInfo.role || "Department",
          message: message.trim(),
          stage_name: stageName,
          mentioned_users,
          mentioned_department_ids,
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

  // ── cursor helpers ────────────────────────────────────────────────────────

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
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  // ── highlight helpers ─────────────────────────────────────────────────────

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // All mentionable names (users + departments) for scanning
  function allMentionNames(): string[] {
    return [
      ...users.map((u) => u.name),
      ...departments.map((d) => d.value),
    ];
  }

  function buildHighlightedHtml(text: string): string {
    let html = "";
    let remaining = text;
    const names = allMentionNames();

    while (remaining.length > 0) {
      let earliestIndex = -1;
      let matchedName = "";

      for (const name of names) {
        const idx = remaining.indexOf(`@${name}`);
        if (idx !== -1 && (earliestIndex === -1 || idx < earliestIndex)) {
          earliestIndex = idx;
          matchedName = name;
        }
      }

      if (earliestIndex === -1 || !matchedName) {
        html += escapeHtml(remaining);
        break;
      }
      if (earliestIndex > 0) html += escapeHtml(remaining.substring(0, earliestIndex));
      html += `<span style="color: rgba(1, 161, 92, 1); font-weight: 600;">@${escapeHtml(matchedName)}</span>`;
      remaining = remaining.substring(earliestIndex + matchedName.length + 1);
    }
    return html;
  }

  function updateEditorHighlight() {
    const el = editorRef.current;
    if (!el) return;
    const cursorPos = saveCursorPosition();
    const text = el.textContent || "";
    setMessage(text);
    const html = buildHighlightedHtml(text);
    if (el.textContent === text && el.innerHTML !== html) {
      el.innerHTML = html || "<br>";
      restoreCursorPosition(cursorPos);
    }
  }

  // ── editor event handlers ─────────────────────────────────────────────────

  function handleEditorInput() {
    const el = editorRef.current;
    if (!el) return;
    const text = el.textContent || "";
    setMessage(text);

    const cursorPos = saveCursorPosition();
    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      const charBeforeAt = lastAtIndex > 0 ? text[lastAtIndex - 1] : " ";
      const tail = text.substring(lastAtIndex);

      const isCompletedMention =
        allMentionNames().some(
          (name) =>
            tail === `@${name}` ||
            tail.startsWith(`@${name} `) ||
            tail.startsWith(`@${name}\n`),
        );

      if (
        !isCompletedMention &&
        (charBeforeAt === " " || charBeforeAt === "\n" || lastAtIndex === 0)
      ) {
        setShowMentionDropdown(true);
        setMentionFilter(textAfterAt.toLowerCase());
        setMentionStartIndex(lastAtIndex);
        updateEditorHighlight();
        return;
      }
    }

    setShowMentionDropdown(false);
    setMentionFilter("");
    updateEditorHighlight();
  }

  function handleSelectMention(item: MentionItem) {
    const el = editorRef.current;
    if (!el) return;
    const text = el.textContent || "";
    const cursorPos = saveCursorPosition();
    const name = item.kind === "user" ? item.name : item.name;
    const beforeMention = text.substring(0, mentionStartIndex);
    const afterMention = text.substring(cursorPos);
    const newMessage = `${beforeMention}@${name} ${afterMention}`;
    setMessage(newMessage);
    setShowMentionDropdown(false);
    setMentionFilter("");

    const html = buildHighlightedHtml(newMessage);
    el.innerHTML = html || "<br>";
    restoreCursorPosition(mentionStartIndex + name.length + 2);
    el.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && !e.shiftKey && !showMentionDropdown) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") setShowMentionDropdown(false);
  }

  // ── filtered dropdown items ───────────────────────────────────────────────

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(mentionFilter),
  );
  const filteredDepts = departments.filter((d) =>
    d.value.toLowerCase().includes(mentionFilter),
  );
  const hasDropdownItems = filteredUsers.length > 0 || filteredDepts.length > 0;

  // ── render message with highlighted @mentions ────────────────────────────

  function renderMessage(msg: string) {
    const parts: React.ReactNode[] = [];
    let remaining = msg;
    let key = 0;
    const names = allMentionNames();

    while (remaining.length > 0) {
      let earliestIndex = -1;
      let matchedName = "";

      for (const name of names) {
        const idx = remaining.indexOf(`@${name}`);
        if (idx !== -1 && (earliestIndex === -1 || idx < earliestIndex)) {
          earliestIndex = idx;
          matchedName = name;
        }
      }

      if (earliestIndex === -1 || !matchedName) {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }
      if (earliestIndex > 0) {
        parts.push(<span key={key++}>{remaining.substring(0, earliestIndex)}</span>);
      }
      parts.push(
        <span key={key++} style={{ color: "rgba(1, 161, 92, 1)", fontWeight: "600" }}>
          @{matchedName}
        </span>,
      );
      remaining = remaining.substring(earliestIndex + matchedName.length + 1);
    }

    return parts;
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return `${date.getDate()} ${date.toLocaleString("en-US", { month: "short" })}`;
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

      {/* Comments list */}
      <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
        {comments.length === 0 && (
          <p style={{ color: "#9ca3af" }}>No comments yet.</p>
        )}

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
          <div key={comment.id} ref={(el) => { commentRefs.current[index] = el; }}>
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
                  <span style={{ color: "#9ca3af" }}>{formatDate(comment.created_at)}</span>
                  <span style={{ color: "#9ca3af", scale: "2" }}>•</span>
                  <span style={{ color: "#9ca3af", fontStyle: "italic" }}>{comment.stage_name}</span>
                </div>
                <div style={{ fontSize: "14px", lineHeight: "1.5" }}>
                  {renderMessage(comment.message)}
                </div>
              </div>
            </div>

            {index < comments.length - 1 && (
              <div style={{ borderBottom: "1px solid #e5e7eb", marginLeft: "48px" }} />
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
            data-placeholder="Write a comment… Use @ to mention someone or a department"
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              lineHeight: "1.5",
              fontFamily: "inherit",
              fontSize: "14px",
              minHeight: "50px",
              whiteSpace: "pre-wrap",
              wordWrap: "break-word",
            }}
          />

          {/* Mention dropdown */}
          {showMentionDropdown && hasDropdownItems && (
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
                padding: "4px 0",
                zIndex: 10,
                minWidth: "260px",
                maxHeight: "260px",
                overflowY: "auto",
              }}
            >
              {/* People section */}
              {filteredUsers.length > 0 && (
                <>
                  <div
                    style={{
                      padding: "6px 12px 4px",
                      fontSize: "10px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                      color: "#9ca3af",
                    }}
                  >
                    People
                  </div>
                  {filteredUsers.map((user) => (
                    <div
                      key={user.sub}
                      onClick={() =>
                        handleSelectMention({ kind: "user", ...user })
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "7px 12px",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f3f4f6")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          backgroundColor: "#1a1a1a",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "700",
                          fontSize: "12px",
                          flexShrink: 0,
                        }}
                      >
                        {getNameLetter(user.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: "600" }}>{user.name}</div>
                        <div style={{ fontSize: "12px", color: "#9ca3af" }}>{user.role}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Divider between sections */}
              {filteredUsers.length > 0 && filteredDepts.length > 0 && (
                <div style={{ borderTop: "1px solid #f0f0f0", margin: "4px 0" }} />
              )}

              {/* Departments section */}
              {filteredDepts.length > 0 && (
                <>
                  <div
                    style={{
                      padding: "6px 12px 4px",
                      fontSize: "10px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                      color: "#9ca3af",
                    }}
                  >
                    Departments
                  </div>
                  {filteredDepts.map((dept) => (
                    <div
                      key={dept.id}
                      onClick={() =>
                        handleSelectMention({ kind: "department", id: dept.id, name: dept.value })
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "7px 12px",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f3f4f6")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "8px",
                          backgroundColor: "#eef0fd",
                          color: "#4f6ef7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "700",
                          fontSize: "12px",
                          flexShrink: 0,
                        }}
                      >
                        #
                      </div>
                      <div style={{ fontWeight: "600" }}>{dept.value}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{ cursor: "pointer", fontSize: "18px", color: "black" }}
            title="Mention someone or a department"
            onClick={() => {
              const el = editorRef.current;
              if (el) {
                const text = el.textContent || "";
                el.textContent = text + "@";
                setMessage(text + "@");
                setShowMentionDropdown(true);
                setMentionFilter("");
                setMentionStartIndex(text.length);
                const range = document.createRange();
                range.selectNodeContents(el);
                range.collapse(false);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
                el.focus();
              }
            }}
          >
            @
          </span>

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
