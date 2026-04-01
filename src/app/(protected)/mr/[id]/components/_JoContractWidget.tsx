"use client";

import { useState, useRef } from "react";
import Button from "@/app/components/Button";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import { toast } from "@/app/components/Toast";
import { useAuth } from "@/app/context/AuthContext";

type JoContractWidgetProps = {
  mrHeaderId: number;
  progressId: number;
  departmentId: number;
  initialContractFile: string | null;
  initialOtherDocsFile: string | null;
};

export default function JoContractWidget({
  mrHeaderId,
  progressId,
  departmentId,
  initialContractFile,
  initialOtherDocsFile,
}: JoContractWidgetProps) {
  const { userInfo } = useAuth();
  const userDeptId = userInfo?.departmentID;
  const isManager = userDeptId === 8;
  const isProcurement = userDeptId === 9;
  const isOwnDepartment = userDeptId === departmentId;

  // Upload: procurement or manager, from quotations (7) through completed (25)
  const canUpload =
    (isManager || isProcurement) &&
    [7, 10, 11, 25].includes(progressId);
  // Delete: procurement or manager, same stages
  const canDelete =
    (isManager || isProcurement) &&
    [7, 10, 11, 25].includes(progressId);
  const uploadIcon = "/icons/upload.svg";
  const deleteIcon = "/icons/trash.svg";

  const [contractFile, setContractFile] = useState<string | null>(
    initialContractFile,
  );
  const [otherDocsFile, setOtherDocsFile] = useState<string | null>(
    initialOtherDocsFile,
  );
  const [isUploadingContract, setIsUploadingContract] = useState(false);
  const [isUploadingOtherDocs, setIsUploadingOtherDocs] = useState(false);

  const contractInputRef = useRef<HTMLInputElement>(null);
  const otherDocsInputRef = useRef<HTMLInputElement>(null);

  const externalLinkIcon = "/icons/external-link.svg";
  const supplierContractIcon = "/icons/supplier-contract.svg";

  async function uploadFileToS3(file: File, folder: string): Promise<string> {
    const formData = new FormData();
    formData.append("folder", folder);
    formData.append("files", file);

    const res = await fetch("/api/s3", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();
    return data.urls[0];
  }

  async function handleUploadContract(file: File) {
    setIsUploadingContract(true);
    try {
      const uploadedUrl = await uploadFileToS3(file, "jo-contracts");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateJoContract",
          id: mrHeaderId,
          jo_contract_file: uploadedUrl,
        }),
      });
      if (res.ok) {
        setContractFile(uploadedUrl);
        toast("Contract uploaded", "success");
      }
    } catch (err) {
      console.error("Error uploading contract:", err);
      toast("Failed to upload contract", "error");
    } finally {
      setIsUploadingContract(false);
    }
  }

  async function handleUploadOtherDocs(file: File) {
    setIsUploadingOtherDocs(true);
    try {
      const uploadedUrl = await uploadFileToS3(file, "jo-other-docs");
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateJoOtherDocs",
          id: mrHeaderId,
          jo_other_docs_file: uploadedUrl,
        }),
      });
      if (res.ok) {
        setOtherDocsFile(uploadedUrl);
        toast("Other docs uploaded", "success");
      }
    } catch (err) {
      console.error("Error uploading other docs:", err);
      toast("Failed to upload other docs", "error");
    } finally {
      setIsUploadingOtherDocs(false);
    }
  }

  async function handleDeleteContract() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateJoContract",
          id: mrHeaderId,
          jo_contract_file: null,
        }),
      });
      if (res.ok) {
        setContractFile(null);
        toast("Contract removed", "success");
      }
    } catch (err) {
      console.error("Error removing contract:", err);
      toast("Failed to remove contract", "error");
    }
  }

  async function handleDeleteOtherDocs() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/mr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateJoOtherDocs",
          id: mrHeaderId,
          jo_other_docs_file: null,
        }),
      });
      if (res.ok) {
        setOtherDocsFile(null);
        toast("Other docs removed", "success");
      }
    } catch (err) {
      console.error("Error removing other docs:", err);
      toast("Failed to remove other docs", "error");
    }
  }

  // Hidden file inputs
  const fileInputs = (
    <>
      <input
        ref={contractInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUploadContract(file);
          e.target.value = "";
        }}
      />
      <input
        ref={otherDocsInputRef}
        type="file"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUploadOtherDocs(file);
          e.target.value = "";
        }}
      />
    </>
  );

  return (
    <div
      className="widget-container"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minWidth: "200px",
      }}
    >
      {fileInputs}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <img src={supplierContractIcon} alt="contract" />
        <InfoPopUpButton
          text={
            <>
              <div>
                <small>CONTRACT</small>
                <h2>
                  {contractFile ? (
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <Button
                        componentType={"link"}
                        bgColor={"rgba(239, 239, 239, 1)"}
                        borderColor={"rgba(223, 223, 223, 1)"}
                        textColor={"black"}
                        style={{ padding: "7px 7px" }}
                        href={contractFile}
                        target="_blank"
                      >
                        <img src={externalLinkIcon} alt="external link" />
                      </Button>
                      {canDelete && (
                        <Button
                          componentType={"button"}
                          bgColor={"rgba(239, 239, 239, 1)"}
                          borderColor={"rgba(223, 223, 223, 1)"}
                          textColor={"black"}
                          style={{ padding: "7px 7px" }}
                          onClick={handleDeleteContract}
                        >
                          <img src={deleteIcon} alt="delete" />
                        </Button>
                      )}
                    </div>
                  ) : canUpload ? (
                    <Button
                      componentType={"button"}
                      bgColor={"black"}
                      borderColor={"black"}
                      textColor={"white"}
                      style={{ padding: "7px 20px", borderRadius: "25px" }}
                      onClick={() => contractInputRef.current?.click()}
                      disabled={isUploadingContract}
                    >
                      Upload Contract <img src={uploadIcon} alt="upload" />
                    </Button>
                  ) : (
                    "-"
                  )}
                </h2>
              </div>
              <br />
              <div>
                <small>OTHER DOCS</small>
                <h2>
                  {otherDocsFile ? (
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <Button
                        componentType={"link"}
                        bgColor={"rgba(239, 239, 239, 1)"}
                        borderColor={"rgba(223, 223, 223, 1)"}
                        textColor={"black"}
                        style={{ padding: "7px 7px" }}
                        href={otherDocsFile}
                        target="_blank"
                      >
                        <img src={externalLinkIcon} alt="external link" />
                      </Button>
                      {canDelete && (
                        <Button
                          componentType={"button"}
                          bgColor={"rgba(239, 239, 239, 1)"}
                          borderColor={"rgba(223, 223, 223, 1)"}
                          textColor={"black"}
                          style={{ padding: "7px 7px" }}
                          onClick={handleDeleteOtherDocs}
                        >
                          <img src={deleteIcon} alt="delete" />
                        </Button>
                      )}
                    </div>
                  ) : canUpload ? (
                    <Button
                      componentType={"button"}
                      bgColor={"black"}
                      borderColor={"black"}
                      textColor={"white"}
                      style={{ padding: "7px 20px", borderRadius: "25px" }}
                      onClick={() => otherDocsInputRef.current?.click()}
                      disabled={isUploadingOtherDocs}
                    >
                      Upload Other Docs <img src={uploadIcon} alt="upload" />
                    </Button>
                  ) : (
                    "-"
                  )}
                </h2>
              </div>
            </>
          }
          header={"CONTRACT"}
        />
      </div>
      <h2>CONTRACT</h2>
    </div>
  );
}
