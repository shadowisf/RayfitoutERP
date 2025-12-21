"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { toast } from "@/app/components/Toast";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { MrLine } from "../../types/mrLine";
import { MrHeader } from "../../types/mrHeader";
import { LpoHeader } from "../../types/lpoHeader";

type ResolutionButtonProps = {
  mrHeader: MrHeader;
  item: MrLine;
};

export default function ResolutionButton({
  mrHeader,
  item,
}: ResolutionButtonProps) {
  const router = useRouter();

  const { userInfo } = useAuth();

  const pencilIcon = "/icons/pencil.svg";
  const uploadIcon = "/icons/upload.svg";
  const plusIcon = "/icons/plus.svg";

  const [isOpen, setIsOpen] = useState(false);

  const [type, setType] = useState("");

  async function handleSubmit() {}

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(239, 239, 239, 1)"}
        borderColor={"rgba(207, 207, 207, 1)"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ borderRadius: "5px", padding: "7px 7px" }}
      >
        <img src={plusIcon} alt="plus" />
      </Button>

      {isOpen && (
        <FormPopUp
          header="CREATE RESOLUTION"
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div className="info-row">
            <InputItem
              label={"TYPE"}
              value={type}
              type={"select"}
              placeholder={"SELECT TYPE"}
              required
              onChange={(e) => setType(e.target.value)}
              selectOptions={[
                "Return/refund",
                "Replace",
                "Conditionally accepted",
                "Reject/scrap",
              ]}
            />
          </div>

          {type === "Return/refund" && (
            <table className="items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>DESCRIPTION</th>
                  <th>FAILED QUANTITY</th>
                  <th>RETURN QUANTITY</th>
                  <th>TOTAL PRICE</th>
                </tr>
              </thead>
              <tbody>
                <tr key={item.id}>
                  <td>1</td>
                  <td>{item.material_description}</td>
                  <td>
                    {item.quantity} {item.unit}
                  </td>
                  <td>
                    <div className="input-prefix right">
                      <span>AED</span>
                      <input
                        type="text"
                        placeholder="ENTER UNIT PRICE"
                        value={unitPrices[index] || ""}
                        onChange={(e) =>
                          handleUnitPriceChange(index, e.target.value)
                        }
                      />
                    </div>
                  </td>
                  <td>{totalPrices[index] || "0"} AED</td>
                </tr>
              </tbody>
            </table>
          )}
        </FormPopUp>
      )}
    </>
  );
}
