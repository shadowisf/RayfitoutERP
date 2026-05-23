"use client";

import Button from "@/app/components/Button";
import FormPopUp from "@/app/components/FormPopup";
import InputItem from "@/app/components/InputItem";
import { useEffect, useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { toast } from "@/app/components/Toast";
import { useRouter } from "next/navigation";
import SingleSelectDropdown from "@/app/components/SingleSelectDropdown";
import SingleUploadFileBox from "@/app/components/SingleUploadFileBox";
import { InventoryItem } from "../../types/inventoryItem";
import FormContextHeader from "@/app/components/FormContextHeader";
import CreateSupplierButton from "@/app/(protected)/vendor/components/_CreateSupplierButton";
import MultipleSelectBoqItemButton from "@/app/components/_MultipleSelectBoqItemButton";
import { useRefresh } from "@/app/context/RefreshContext";

type ManualAddToStockButtonProps = {
  inventoryItem: InventoryItem;
};

export default function ManualAddToStockButton({
  inventoryItem,
}: ManualAddToStockButtonProps) {
  const { userInfo } = useAuth();

  const router = useRouter();
  const { refresh } = useRefresh();


  const [isOpen, setIsOpen] = useState(false);

  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [supplierID, setSupplierID] = useState<string | number>("");
  const [quantity, setQuantity] = useState("");
  const [reasonForEntry, setReasonForEntry] = useState("");
  const [projectID, setProjectID] = useState<string | number>("");
  const [boqLineIDs, setBoqLineIDs] = useState<number[]>([]); // ✅ Changed to array
  const [condition, setCondition] = useState("");
  const [grnFile, setGrnFile] = useState<File | null>(null);
  const [qcReportFile, setQcReportFile] = useState<File | null>(null);
  const [lpoFile, setLpoFile] = useState<File | null>(null);
  const [dnFile, setDnFile] = useState<File | null>(null);
  const [unitPrice, setUnitPrice] = useState("");

  const [supplierValues, setSupplierValues] = useState<any>([]);
  const [stockLocationValues, setStockLocationValues] = useState<any>([]);
  const [projectValues, setProjectValues] = useState<any>([]);

  async function fetchSuppliers() {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        setSupplierValues(data);
      });
  }

  useEffect(() => {
    fetchSuppliers();

    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/projects`, {
      method: "GET",
    })
      .then((res) => res.json())
      .then((data) => {
        const names = data.map((item: any) => item.name);
        setStockLocationValues(names);

        setProjectValues(data);
      });
  }, []);

  // ✅ Handle BOQ selection
  const handleBoqSelection = (boqIDs: number[], boqInfo: string) => {
    setBoqLineIDs(boqIDs);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    let grnFileUrl: string[] = [];
    let qcReportFileUrl: string[] = [];
    let lpoFileUrl: string[] = [];
    let dnFileUrl: string[] = [];

    // Upload files if any selected
    if (grnFile) {
      try {
        const formData = new FormData();

        formData.append("files", grnFile);
        formData.append("folder", "stock-grns");

        const uploadResponse = await fetch("/api/s3", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload files");
        }

        const uploadResult = await uploadResponse.json();
        grnFileUrl = uploadResult.urls;
      } catch (error) {
        console.error("Error uploading files:", error);
        toast("Failed to upload files", "error");
        return;
      }
    }

    if (qcReportFile) {
      try {
        const formData = new FormData();

        formData.append("files", qcReportFile);
        formData.append("folder", "stock-qc-reports");

        const uploadResponse = await fetch("/api/s3", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload files");
        }

        const uploadResult = await uploadResponse.json();
        qcReportFileUrl = uploadResult.urls;
      } catch (error) {
        console.error("Error uploading files:", error);
        toast("Failed to upload files", "error");
        return;
      }
    }

    if (lpoFile) {
      try {
        const formData = new FormData();

        formData.append("files", lpoFile);
        formData.append("folder", "stock-lpos");

        const uploadResponse = await fetch("/api/s3", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload files");
        }

        const uploadResult = await uploadResponse.json();
        lpoFileUrl = uploadResult.urls;
      } catch (error) {
        console.error("Error uploading files:", error);
        toast("Failed to upload files", "error");
        return;
      }
    }

    if (dnFile) {
      try {
        const formData = new FormData();

        formData.append("files", dnFile);
        formData.append("folder", "stock-dns");

        const uploadResponse = await fetch("/api/s3", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload files");
        }

        const uploadResult = await uploadResponse.json();
        dnFileUrl = uploadResult.urls;
      } catch (error) {
        console.error("Error uploading files:", error);
        toast("Failed to upload files", "error");
        return;
      }
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addStock",
        inventory_item_id: inventoryItem.id,
        inventory_item_unit: inventoryItem.unit,
        inventory_item_description: inventoryItem.description,
        supplier_id: supplierID,
        received_by: userInfo?.name,
        reason_for_entry: reasonForEntry,
        quantity,
        location,
        notes,
        unit_price: unitPrice,
        project_id: projectID,
        boq_line_ids: boqLineIDs, // ✅ Send as array
        condition,
        grn_file: JSON.stringify(grnFileUrl),
        qc_report_file: JSON.stringify(qcReportFileUrl),
        lpo_file: JSON.stringify(lpoFileUrl),
        dn_file: JSON.stringify(dnFileUrl),
        manually_add: true,
      }),
    });

    if (res.ok) {
      toast("Added to stock", "success");

      // Reset form fields
      setLocation("");
      setNotes("");
      setSupplierID("");
      setQuantity("");
      setReasonForEntry("");
      setProjectID("");
      setBoqLineIDs([]); // ✅ Reset array
      setCondition("");
      setGrnFile(null);
      setQcReportFile(null);
      setLpoFile(null);
      setDnFile(null);
      setUnitPrice("");

      await refresh();

      setIsOpen(false);
    } else {
      toast("Failed to add to stock", "error");
    }
  }

  return (
    <>
      <Button
        componentType={"button"}
        bgColor={"rgba(0, 163, 93, 1)"}
        borderColor={"rgba(0, 163, 93, 1)"}
        textColor={"white"}
        onClick={() => setIsOpen(true)}
      >
        ADD STOCK +
      </Button>

      {isOpen && (
        <FormPopUp
          header={`ADD STOCK - ${inventoryItem.description.toUpperCase()}`}
          setIsOpen={setIsOpen}
          handleSubmit={handleSubmit}
          addButtonLabel={"CONFIRM"}
        >
          <FormContextHeader>STOCK CONTEXT</FormContextHeader>
          <div className="input-row half">
            <InputItem
              label={"ADDED BY"}
              value={userInfo?.name || ""}
              type={"text"}
              placeholder={"ENTER NAME"}
              required
              disabled
              onChange={() => {}}
            />
            <InputItem
              label={"REASON FOR ENTRY"}
              value={reasonForEntry}
              type={"select"}
              placeholder={"SELECT REASON FOR ENTRY"}
              required
              onChange={(e) => setReasonForEntry(e.target.value)}
              selectOptions={[
                "Opening stock quantity",
                "Production output",
                "Direct purchase (out of workflow)",
                "Vendor replacement",
                "Return from processing",
                "Return from use",
                "Return from site",
                "Found stock/inventory adjustment",
              ]}
            />
          </div>

          <br />

          <FormContextHeader>SOURCE & RESPONSIBLITY</FormContextHeader>
          <div className="input-row half">
            <SingleSelectDropdown
              label={"VENDOR"}
              selectedValue={supplierID}
              onChange={setSupplierID}
              placeholder={"SELECT VENDOR"}
              dbData={supplierValues}
              idField="id"
              labelField="name"
              required={false}
              bottomButtonComponent={
                <CreateSupplierButton
                  full={true}
                  onSuccess={() => fetchSuppliers()}
                />
              }
            />
            <InputItem
              label={"UNIT PRICE"}
              value={unitPrice}
              type={"text"}
              placeholder={"ENTER UNIT PRICE"}
              onChange={(e) => {
                let val = e.target.value;

                // Remove any commas
                val = val.replace(/,/g, "");

                // Clear input if empty
                if (val === "") {
                  setUnitPrice("");
                  return;
                }

                // Allow only numbers and a single decimal point
                if (!/^\d*\.?\d*$/.test(val)) {
                  return;
                }

                // Set the value as-is (with decimal if present)
                setUnitPrice(val);
              }}
            />
          </div>

          <div className="input-row half">
            <SingleSelectDropdown
              label="PROJECT REFERENCE"
              dbData={projectValues}
              selectedValue={projectID}
              onChange={(id) => setProjectID(id)}
              placeholder="SELECT PROJECT"
              idField="id"
              labelField="name"
              required={false}
            />
            <div className="input-item">
              <label className="custom">
                <span>BILL OF QUANTITY</span>
                <small>(OPTIONAL)</small>
              </label>

              {/* ✅ Updated to use array */}
              <MultipleSelectBoqItemButton
                projectID={Number(projectID)}
                onSelectBoq={handleBoqSelection}
                currentBoqLineIDs={boqLineIDs}
                disabled={projectID === ""}
                style={{ height: "30.5px" }}
              />
            </div>
          </div>

          <br />

          <FormContextHeader>STOCK DETAILS</FormContextHeader>
          <div className="input-row half">
            <div className="input-item">
              <label>QUANTITY</label>
              <div className="input-prefix right">
                <span>{inventoryItem?.unit}</span>
                <input
                  type="text"
                  placeholder="ENTER QUANTITY"
                  required
                  value={quantity}
                  onChange={(e) => {
                    let val = e.target.value;

                    // Remove any commas
                    val = val.replace(/,/g, "");

                    // Clear input if empty
                    if (val === "") {
                      setQuantity("");
                      return;
                    }

                    // Allow only numbers and a single decimal point
                    if (!/^\d*\.?\d*$/.test(val)) {
                      return;
                    }

                    // Set the value as-is (with decimal if present)
                    setQuantity(val);
                  }}
                />
              </div>
            </div>
            <InputItem
              label={"STOCK LOCATION"}
              value={location}
              type={"select"}
              placeholder={"SELECT LOCATION"}
              required
              onChange={(e) => setLocation(e.target.value)}
              selectOptions={[
                "Headquarters",
                "Umm Al Quwain Warehouse",
                ...stockLocationValues,
              ]}
            />
          </div>

          <br />

          <FormContextHeader>PROOF/ATTACHMENTS</FormContextHeader>
          <div className="input-row half">
            <SingleUploadFileBox
              fileState={grnFile}
              setFileState={setGrnFile}
              label={"GRN"}
              acceptedFileTypes={".pdf"}
            />
            <SingleUploadFileBox
              fileState={qcReportFile}
              setFileState={setQcReportFile}
              label={"QC REPORT"}
              acceptedFileTypes={".pdf"}
            />
          </div>

          <div className="input-row half">
            <SingleUploadFileBox
              fileState={lpoFile}
              setFileState={setLpoFile}
              label={"LPO"}
              acceptedFileTypes={".pdf"}
            />
            <SingleUploadFileBox
              fileState={dnFile}
              setFileState={setDnFile}
              label={"DN"}
              acceptedFileTypes={".pdf"}
            />
          </div>
        </FormPopUp>
      )}
    </>
  );
}
