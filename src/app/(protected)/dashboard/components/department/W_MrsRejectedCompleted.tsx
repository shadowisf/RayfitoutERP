import { useAuth } from "@/app/context/AuthContext";
import { useEffect, useState } from "react";

export default function MrsRejectedCompleted() {
  const { userInfo } = useAuth();

  const [rejected, setRejected] = useState(0);
  const [completed, setCompleted] = useState(0);

  const rejectedIcon = "/icons/dashboard-department-rejected.svg";
  const completedIcon = "/icons/dashboard-department-completed.svg";

  useEffect(() => {
    fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/dashboard/department/getTotalMrsRejectedCompleted`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          department_id: userInfo?.departmentID,
        }),
      }
    ).then((res) => {
      res.json().then((data) => {
        setRejected(data.rejected || 0);
        setCompleted(data.completed || 0);
      });
    });
  }, []);

  return (
    <div className="item">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "25px",
        }}
      >
        <div
          className="item"
          style={{ backgroundColor: "rgba(255, 224, 224, 1)" }}
        >
          <div className="top">
            <h3 style={{ color: "rgba(74, 85, 101, 1)" }}>MR REJECTED</h3>
            <img src={rejectedIcon} alt="rejected" />
          </div>
          <div>
            <div className="bottom">
              <p className="number">{rejected}</p>
            </div>
          </div>
        </div>
        <div
          className="item"
          style={{ backgroundColor: "rgba(188, 255, 226, 1)" }}
        >
          <div className="top">
            <h3 style={{ color: "rgba(74, 85, 101, 1)" }}>MR COMPLETED</h3>
            <img src={completedIcon} alt="completed" />
          </div>
          <div>
            <div className="bottom">
              <p className="number">{completed}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
