"use client";

import { useState, useEffect } from "react";
import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import { toast } from "@/app/components/Toast";

type BoqLine = {
  id: number;
  item_number: string;
  item_name: string;
  category: string;
  sub_category: string;
  raw?: any;
};

type SelectBoqButtonProps = {
  projectID: string | number;
  selectedBoqLine?: number;
  onBoqSelect: (selectedId: number) => void;
};

export default function SelectBoqButton({
  projectID,
  selectedBoqLine,
  onBoqSelect,
}: SelectBoqButtonProps) {
  const [isSelectBoqOpen, setIsSelectBoqOpen] = useState(false);
  const [boqLineValues, setBoqLineValues] = useState<BoqLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tempSelectedBoq, setTempSelectedBoq] = useState<number | null>(null);

  // Fetch BOQ lines when modal opens and project is selected
  useEffect(() => {
    if (isSelectBoqOpen && projectID) {
      setIsLoading(true);
      setTempSelectedBoq(selectedBoqLine || null);

      fetch("/api/boq/getAllBoqLinesWithNumberRef", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectID,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          const transformedData = data.map((boqLine: any) => ({
            id: boqLine.id,
            item_number: boqLine.item_number,
            item_name: boqLine.item_name,
            category: boqLine.category,
            sub_category: boqLine.sub_category,
            raw: boqLine,
          }));

          setBoqLineValues(transformedData);
        })
        .catch((err) => {
          console.error("Error fetching BOQ lines:", err);
          toast("Failed to load BOQ lines", "error");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isSelectBoqOpen, projectID, selectedBoqLine]);

  function handleAddBoqLine(e?: React.FormEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!tempSelectedBoq) {
      toast("Please select a BOQ line", "error");
      return;
    }

    onBoqSelect(tempSelectedBoq);
    setIsSelectBoqOpen(false);
    setTempSelectedBoq(null);
  }

  return (
    <>
      {/* Select BOQ Button */}
      <Button
        componentType={"button"}
        bgColor="rgba(239, 239, 239, 1)"
        borderColor="rgba(239, 239, 239, 1)"
        textColor={"black"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!projectID) {
            toast("Please select a project first", "error");
            return;
          }
          setIsSelectBoqOpen(true);
        }}
        disabled={!projectID}
        full
        style={{ padding: "20px 0px" }}
      >
        SELECT BOQ LINE +
      </Button>

      {/* Select BOQ Modal */}
      {isSelectBoqOpen && (
        <FormPopUp
          header={"SELECT BOQ LINE"}
          setIsOpen={setIsSelectBoqOpen}
          handleSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleAddBoqLine(e);
          }}
          addButtonLabel={"CONFIRM"}
          style={{ minWidth: "1200px" }}
        >
          {isLoading ? (
            <div
              style={{
                textAlign: "center",
                padding: "40px",
                color: "#888",
              }}
            >
              Loading BOQ lines...
            </div>
          ) : (
            <table className="items-table two-toned">
              <thead>
                <tr>
                  <th></th>
                  <th>#</th>
                  <th>ITEM NUMBER</th>
                  <th>ITEM NAME</th>
                  <th>CATEGORY</th>
                  <th>SUB-CATEGORY</th>
                </tr>
              </thead>
              <tbody>
                {boqLineValues.length > 0 ? (
                  boqLineValues.map((boq, index) => {
                    return (
                      <tr
                        key={boq.id}
                        onClick={(e) => {
                          e.preventDefault();
                          setTempSelectedBoq(boq.id);
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="radio"
                            name="boq-select"
                            value={boq.id}
                            checked={tempSelectedBoq === boq.id}
                            onChange={(e) => {
                              e.stopPropagation();
                              setTempSelectedBoq(boq.id);
                            }}
                            style={{
                              width: "18px",
                              height: "18px",
                              cursor: "pointer",
                            }}
                          />
                        </td>
                        <td>{index + 1}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {boq.item_number}
                        </td>
                        <td>{boq.item_name}</td>
                        <td>{boq.category || "-"}</td>
                        <td>{boq.sub_category || "-"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ textAlign: "center", padding: "40px" }}
                    >
                      {projectID
                        ? "No BOQ lines available for this project"
                        : "Please select a project first"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </FormPopUp>
      )}
    </>
  );
}
