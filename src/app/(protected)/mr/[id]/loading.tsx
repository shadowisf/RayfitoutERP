const SHIMMER: React.CSSProperties = {
  background:
    "linear-gradient(90deg, rgba(0,0,0,0.06) 25%, rgba(0,0,0,0.10) 37%, rgba(0,0,0,0.06) 63%)",
  backgroundSize: "600px 100%",
  animation: "shimmer 1.4s ease infinite",
  borderRadius: "6px",
};

function S({
  w = "100%",
  h = 12,
  style,
}: {
  w?: string | number;
  h?: number;
  style?: React.CSSProperties;
}) {
  return <div style={{ width: w, height: h, ...SHIMMER, ...style }} />;
}

export default function LpoDetailSkeleton() {
  return (
    <>
    <style>{`
      @media (max-width: 768px) { .mr-loading-desktop { display: none !important; } }
      @media (min-width: 769px) { .mr-loading-mobile { display: none !important; } }
    `}</style>

    {/* ── Mobile skeleton ── */}
    <div className="mr-loading-mobile" style={{ padding: "16px", paddingBottom: "80px", background: "rgba(245,245,245,1)", minHeight: "100dvh", boxSizing: "border-box" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <S w="200px" h={10} />
        <S w="28px" h={28} style={{ borderRadius: "6px" }} />
      </div>

      {/* Requisition Timeline card */}
      <div style={{ background: "white", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
        <S w="160px" h={14} style={{ marginBottom: 6 }} />
        <S w="240px" h={9} style={{ marginBottom: 18 }} />
        {/* Timeline track */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 0 }}>
          <div style={{ position: "absolute", top: "50%", left: 17, right: 17, height: 2, background: "rgba(0,0,0,0.08)", transform: "translateY(-50%)" }} />
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: i === 1 ? "flex-start" : i === 3 ? "flex-end" : "center", gap: 6, position: "relative" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", ...SHIMMER }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <S w="70px" h={8} />
          <S w="65px" h={8} />
          <S w="75px" h={8} />
        </div>
        {/* Progress bar */}
        <S w="100%" h={4} style={{ borderRadius: 2, marginTop: 10 }} />
      </div>

      {/* Material Requests section */}
      <div style={{ background: "white", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
        <S w="140px" h={14} style={{ marginBottom: 14 }} />

        {/* Category tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <S w="48px" h={32} style={{ borderRadius: "8px" }} />
          <S w="80px" h={32} style={{ borderRadius: "8px" }} />
        </div>

        {/* Item group header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <S w="160px" h={12} />
          <S w="24px" h={24} style={{ borderRadius: "6px" }} />
        </div>

        {/* Item rows */}
        {[1, 2].map((i) => (
          <div key={i} style={{ border: "1px solid rgba(217,217,217,1)", borderRadius: "8px", padding: "12px", display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <S w="24px" h={24} style={{ borderRadius: "50%", flexShrink: 0 }} />
            <S w="140px" h={12} style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
              <S w="44px" h={32} style={{ borderRadius: "6px" }} />
              <S w="70px" h={32} style={{ borderRadius: "6px" }} />
            </div>
          </div>
        ))}

        {/* ADD ITEM button */}
        <S w="100%" h={42} style={{ borderRadius: "8px", marginTop: 8 }} />
      </div>

      {/* Comments section */}
      <div style={{ background: "white", borderRadius: "12px", padding: "16px" }}>
        <S w="90px" h={13} style={{ marginBottom: 8 }} />
        <S w="100px" h={10} style={{ marginBottom: 14 }} />
        <div style={{ border: "1px solid rgba(220,220,220,1)", borderRadius: "10px", padding: "14px" }}>
          <S w="70%" h={10} style={{ marginBottom: 10 }} />
          <S w="55%" h={10} style={{ marginBottom: 14 }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <S w="28px" h={28} style={{ borderRadius: "6px" }} />
            <S w="60px" h={30} style={{ borderRadius: "6px" }} />
          </div>
        </div>
      </div>

      {/* Fixed bottom bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px", background: "white", borderTop: "1px solid rgba(220,220,220,1)" }}>
        <S w="100%" h={44} style={{ borderRadius: "50px" }} />
      </div>
    </div>

    {/* ── Desktop skeleton ── */}
    <div className="mr-loading-desktop dashboard">
      {/* ── Breadcrumb + download button ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <S w="400px" h={22} />
        <S w="140px" h={34} style={{ borderRadius: "8px" }} />
      </div>

      <br />

      {/* ── Info card ── */}
      <div className="mr-with-id">
        {/* Top row: MR number + LPO number + status + priority + action buttons */}
        <div className="top">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ display: "flex", gap: "25px", alignItems: "center" }}>
              {/* MR number */}
              <div>
                <S w="70px" h={9} style={{ marginBottom: 6 }} />
                <S w="100px" h={20} />
              </div>
              {/* LPO number */}
              <div>
                <S w="72px" h={9} style={{ marginBottom: 6 }} />
                <S w="100px" h={20} />
              </div>
              {/* Status pill */}
              <S w="110px" h={28} style={{ borderRadius: "50px" }} />
              {/* Priority pill */}
              <S w="130px" h={28} style={{ borderRadius: "50px" }} />
            </div>
            {/* Rollback + delete buttons */}
            <div style={{ display: "flex", gap: "8px" }}>
              <S w="220px" h={34} style={{ borderRadius: "8px" }} />
              <S w="36px" h={36} style={{ borderRadius: "8px" }} />
            </div>
          </div>
        </div>

        <br />
        <br />

        {/* Bottom row: metadata fields */}
        <div className="bottom">
          {/* PROJECT */}
          <div>
            <S w="45px" h={9} style={{ marginBottom: 6 }} />
            <S w="140px" h={18} />
          </div>
          {/* PURPOSE */}
          <div>
            <S w="52px" h={9} style={{ marginBottom: 6 }} />
            <S w="80px" h={18} />
          </div>
          {/* REQUESTED BY */}
          <div>
            <S w="80px" h={9} style={{ marginBottom: 6 }} />
            <S w="110px" h={18} />
          </div>
          {/* REQUESTED FOR */}
          <div>
            <S w="85px" h={9} style={{ marginBottom: 6 }} />
            <S w="120px" h={18} />
          </div>
          {/* DEPARTMENT */}
          <div>
            <S w="72px" h={9} style={{ marginBottom: 6 }} />
            <S w="130px" h={18} />
          </div>
          {/* CREATION DATE */}
          <div>
            <S w="82px" h={9} style={{ marginBottom: 6 }} />
            <S w="90px" h={18} />
          </div>
          {/* REQUIRED DATE */}
          <div>
            <S w="82px" h={9} style={{ marginBottom: 6 }} />
            <S w="90px" h={18} />
          </div>
          {/* DELIVERY DATE */}
          <div>
            <S w="78px" h={9} style={{ marginBottom: 6 }} />
            <S w="90px" h={18} />
          </div>
          {/* CURRENT STAGE DURATION */}
          <div>
            <S w="120px" h={9} style={{ marginBottom: 6 }} />
            <S w="60px" h={22} style={{ borderRadius: "50px" }} />
          </div>
        </div>
      </div>

      <br />
      <br />

      {/* ── Requisition Timeline section ── */}
      <div
        className="mr-with-id"
        style={{ display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <S w="200px" h={16} />

        {/* Timeline track */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 0,
            position: "relative",
            paddingBottom: 8,
          }}
        >
          {/* Connecting line */}
          <div
            style={{
              position: "absolute",
              top: 17,
              left: 17,
              right: 17,
              height: 2,
              background: "rgba(0,0,0,0.08)",
              borderRadius: 2,
            }}
          />
          {[110, 90, 100, 130, 115, 95, 110, 80].map((labelW, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                position: "relative",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  ...SHIMMER,
                  flexShrink: 0,
                }}
              />
              <S w={`${labelW - 20}px`} h={9} />
              <S w={`${labelW - 30}px`} h={8} />
            </div>
          ))}
        </div>
      </div>

      <br />
      <br />

      {/* ── LPO Lines table section ── */}
      <div className="mr-with-id">
        {/* Header + action buttons */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <S w="180px" h={18} />
          <div style={{ display: "flex", gap: 8 }}>
            <S w="80px" h={32} style={{ borderRadius: "8px" }} />
            <S w="100px" h={32} style={{ borderRadius: "8px" }} />
            <S w="80px" h={32} style={{ borderRadius: "8px" }} />
          </div>
        </div>

        {/* Table */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <colgroup>
            <col style={{ width: "40px" }} />
            <col style={{ width: "120px" }} />
            <col style={{ width: "120px" }} />
            <col />
            <col style={{ width: "90px" }} />
            <col style={{ width: "90px" }} />
            <col style={{ width: "110px" }} />
            <col style={{ width: "110px" }} />
            <col style={{ width: "110px" }} />
          </colgroup>
          <thead>
            <tr>
              {[
                "#",
                "CATEGORY",
                "SUBCATEGORY",
                "MATERIAL",
                "QTY",
                "UNIT",
                "UNIT PRICE",
                "TOTAL PRICE",
                "STATUS",
              ].map((_, i) => (
                <th
                  key={i}
                  style={{
                    padding: "10px",
                    borderBottom: "1px solid rgba(220,220,220,1)",
                    textAlign: "left",
                  }}
                >
                  <S w="60%" h={10} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["55%", "70%"],
              ["40%", "60%"],
              ["65%", "75%"],
              ["50%", "65%"],
            ].map(([matW, descW], i) => (
              <tr
                key={i}
                style={{ borderBottom: "1px solid rgba(239,239,239,1)" }}
              >
                <td style={{ padding: "14px 10px" }}>
                  <S w="16px" h={12} />
                </td>
                <td style={{ padding: "14px 10px" }}>
                  <S w={matW} h={12} />
                </td>
                <td style={{ padding: "14px 10px" }}>
                  <S w="60%" h={12} />
                </td>
                <td style={{ padding: "14px 10px" }}>
                  <S w={descW} h={12} style={{ marginBottom: 5 }} />
                  <S w="45%" h={9} />
                </td>
                <td style={{ padding: "14px 10px" }}>
                  <S w="50px" h={12} />
                </td>
                <td style={{ padding: "14px 10px" }}>
                  <S w="40px" h={12} />
                </td>
                <td style={{ padding: "14px 10px" }}>
                  <S w="70px" h={12} />
                </td>
                <td style={{ padding: "14px 10px" }}>
                  <S w="70px" h={12} />
                </td>
                <td style={{ padding: "14px 10px" }}>
                  <S w="80px" h={22} style={{ borderRadius: "50px" }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total rows */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 10,
            marginTop: 16,
            paddingRight: 10,
          }}
        >
          <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
            <S w="70px" h={11} />
            <S w="80px" h={11} />
          </div>
          <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
            <S w="90px" h={11} />
            <S w="80px" h={11} />
          </div>
        </div>
      </div>

      <br />
      <br />

      {/* ── Comments section ── */}
      <div>
        {/* "COMMENTS" heading */}
        <S w="90px" h={13} style={{ marginBottom: 10 }} />

        {/* "No comments yet." line */}
        <S w="110px" h={10} style={{ marginBottom: 16 }} />

        {/* Comment input box */}
        <div
          style={{
            border: "1px solid rgba(220,220,220,1)",
            borderRadius: "10px",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            background: "white",
          }}
        >
          {/* Placeholder text line */}
          <S w="55%" h={10} />

          {/* Bottom row: @ button + SEND button */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <S w="28px" h={28} style={{ borderRadius: "6px" }} />
            <S w="60px" h={30} style={{ borderRadius: "6px" }} />
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
