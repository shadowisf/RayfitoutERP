"use client";

import { useEffect, useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";
import { useRouter } from "next/navigation";
import { BoqLine } from "../../types/boqLine";
import { toast } from "@/app/components/Toast";
import MultiSelectDropdown from "@/app/components/MultiSelectDropdown";
import { useRefresh } from "@/app/context/RefreshContext";

type EditBoqItemLocationButtonProps = {
  item: BoqLine;
  onSuccess?: () => void;
};

export default function EditBoqItemLocationButton({
  item,
  onSuccess,
}: EditBoqItemLocationButtonProps) {
  const router = useRouter();
  const { refresh } = useRefresh();


  const pencilIcon = "/icons/pencil.svg";

  const [isOpen, setIsOpen] = useState(false);

  const [locationValues, setLocationValues] = useState<[]>([]);

  const [locationID, setLocationID] = useState<(string | number)[]>(
    Array.isArray(item.location_ids)
      ? item.location_ids
      : typeof item.location_ids === "string"
        ? item.location_ids
            .split(",")
            .map((id) => Number(id.trim()))
            .filter((id) => !isNaN(id))
        : [],
  );

  // EditBoqItemLocationButton.tsx
  useEffect(() => {
    if (!isOpen) return; // Don't fetch unless modal is open

    let isMounted = true;

    const fetchLocationValues = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/boq/getLocationValues`,
        );

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();

        if (isMounted) {
          setLocationValues(data);
        }
      } catch (err) {
        console.error("Failed to fetch location values:", err);
      }
    };

    fetchLocationValues();

    return () => {
      isMounted = false;
    };
  }, [isOpen]); // Only fetch when modal opens

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/boq`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateLocation",
          location_ids: locationID,
          id: item.id,
        }),
      });

      if (res.ok) {
        toast("Bill of quantity item location updated", "success");

        setIsOpen(false);

        onSuccess && onSuccess();

        await refresh();
      } else {
        toast(
          "Failed to update bill of quantity item. Something went wrong",
          "error",
        );
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast(
        "Failed to update bill of quantity item. Something went wrong",
        "error",
      );
    }
  }

  return (
    <>
      <Button
        componentType="button"
        bgColor={"transparent"}
        borderColor={"transparent"}
        textColor={"black"}
        onClick={() => setIsOpen(true)}
        style={{ padding: "0px" }}
      >
        <img src={pencilIcon} alt="pencil" />
      </Button>

      {isOpen && (
        <FormPopUp
          header={"UPDATE BILL OF QUANTITY ITEM LOCATION"}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <div className="input-row half">
            <MultiSelectDropdown
              label={"LOCATION"}
              selectedValues={locationID}
              onChange={setLocationID}
              placeholder="SELECT LOCATION"
              dbData={locationValues}
              style={{ width: "400px" }}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
