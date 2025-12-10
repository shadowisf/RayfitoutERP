"use client";

import Button from "@/app/components/Button";
import { useAuth } from "@/app/context/AuthContext";
import { useEffect, useState } from "react";

export default function MR() {
  const { userInfo } = useAuth();

  const [mrHeaders, setMrHeaders] = useState([]);

  useEffect(() => {
    if (
      userInfo?.departmentID !== 8 &&
      userInfo?.departmentID !== 9 &&
      userInfo?.departmentID !== 10
    ) {
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "POST",
        body: JSON.stringify({
          action: "getMrHeaders",
          department_id: userInfo?.departmentID,
        }),
      }).then((res) => res.json().then((data) => setMrHeaders(data)));
    } else {
      fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "GET",
      }).then((res) => res.json().then((data) => setMrHeaders(data)));
    }
  }, []);

  return (
    <div className="dashboard">
      <h2>MATERIAL REQUESTS</h2>
      <br />

      <div className="widget-grid material-requests">
        {mrHeaders.map((mr: any) => {
          return (
            <div className="item" key={mr.id}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <small>MR NUMBER</small>
                  <h3>MR-{String(mr.id).padStart(3, "0")}</h3>
                </div>

                <div>
                  <small
                    className="status"
                    style={{
                      backgroundColor: "rgba(255,244,93,1)",
                      color: "rgba(132,107,26,1)",
                    }}
                  >
                    {mr.progress_name}
                  </small>
                </div>
              </div>

              <br />

              <small>REQUESTER</small>
              <h3>{mr.requested_by}</h3>

              <br />

              <small>PROJECT</small>
              <h3>{mr.project_name}</h3>

              <br />

              <small>REQUIRED DATE</small>
              <div
                style={{ display: "flex", alignItems: "center", gap: "25px" }}
              >
                <h3>{new Date(mr.required_date).toLocaleDateString()}</h3>
                <h3
                  style={{
                    padding: "5px 15px",
                    backgroundColor: "rgba(231, 231, 231, 1)",
                    textTransform: "uppercase",
                    borderRadius: "5px",
                  }}
                >
                  {(() => {
                    const required = new Date(mr.required_date);
                    const today = new Date();
                    required.setHours(0, 0, 0, 0);
                    today.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil(
                      (required.getTime() - today.getTime()) /
                        (1000 * 60 * 60 * 24)
                    );
                    if (diffDays > 0) {
                      return `${diffDays} ${
                        diffDays === 1 ? "DAY" : "DAYS"
                      } LEFT`;
                    } else if (diffDays === 0) {
                      return "DUE TODAY";
                    } else {
                      return `${Math.abs(diffDays)} ${
                        Math.abs(diffDays) === 1 ? "DAY" : "DAYS"
                      } OVERDUE`;
                    }
                  })()}
                </h3>
              </div>

              <br />

              <Button
                componentType={"link"}
                bgColor={"black"}
                borderColor={"black"}
                textColor={"white"}
                full
                href={`/mr/${mr.id}`}
              >
                VIEW
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
