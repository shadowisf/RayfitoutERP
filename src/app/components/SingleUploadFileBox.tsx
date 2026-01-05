"use client";

import { useState, useRef } from "react";
import Button from "./Button";
import { toast } from "./Toast";

type SingleUploadFileBoxProps = {
  fileState: File | null;
  setFileState: React.Dispatch<React.SetStateAction<File | null>>;
  label: string;
  required?: boolean;
  placeholder?: string;
  acceptedFileTypes: string;
  buttonLabel?: string;
};

export default function SingleUploadFileBox({
  fileState,
  setFileState,
  label,
  required,
  placeholder = "UPLOAD/DRAG ATTACHMENT",
  acceptedFileTypes,
  buttonLabel = "UPLOAD FILE",
}: SingleUploadFileBoxProps) {
  const pdfIcon = "/icons/pdf.svg";
  const uploadIcon = "/icons/upload.svg";
  const trashIcon = "/icons/trash.svg";

  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const InputRef = useRef<HTMLInputElement | null>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast("File size must be less than 10MB", "error");
      return;
    }

    setFileState(selectedFile);

    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const removeFile = () => {
    setFileState(null);
    setPreview(null);
    if (InputRef.current) {
      InputRef.current.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    if (!isAcceptedFileType(droppedFile)) {
      toast("Invalid file type", "error");
      return;
    }

    if (droppedFile.size > 10 * 1024 * 1024) {
      toast("File size must be less than 10MB", "error");
      return;
    }

    setFileState(droppedFile);

    if (droppedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(droppedFile);
    } else {
      setPreview(null);
    }
  };

  const isAcceptedFileType = (file: File) => {
    const accepted = acceptedFileTypes.split(",").map((type) => type.trim());

    return accepted.some((type) => {
      if (type.endsWith("/*")) {
        return file.type.startsWith(type.replace("/*", "/"));
      }
      if (type.startsWith(".")) {
        return file.name.toLowerCase().endsWith(type.toLowerCase());
      }
      return file.type === type;
    });
  };

  return (
    <div className="input-item">
      <label className="custom">
        <span>{label}</span>{" "}
        {!required && (
          <small style={{ fontStyle: "italic", fontWeight: "100" }}>
            (OPTIONAL)
          </small>
        )}
      </label>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: "1px dashed #d1d5db",
          borderRadius: "5px",
          padding: "40px",
          textAlign: "center",
          backgroundColor: isDragOver
            ? "rgba(169, 255, 218, 1)"
            : "rgba(244, 244, 244, 1)",
          flexDirection: "column",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
          height: "200px",
        }}
      >
        {fileState || preview ? (
          <div
            style={{ width: "100%", display: "flex", justifyContent: "center" }}
          >
            {fileState?.type.startsWith("image/") && preview ? (
              <div
                style={{
                  position: "relative",
                  display: "inline-block",
                }}
              >
                <img
                  src={preview}
                  alt="Preview"
                  style={{
                    maxHeight: "150px",
                    maxWidth: "100%",
                    borderRadius: "5px",
                    objectFit: "contain",
                  }}
                />
                <Button
                  componentType={"button"}
                  bgColor={"rgba(239, 239, 239, 1)"}
                  borderColor={"rgba(223, 223, 223, 1)"}
                  textColor={"black"}
                  style={{
                    position: "absolute",
                    top: "5px",
                    right: "5px",
                    padding: "7px 7px",
                  }}
                  onClick={removeFile}
                >
                  <img src={trashIcon} alt="trash" />
                </Button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px",
                  backgroundColor: "white",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  gap: "25px",
                }}
              >
                <div style={{ display: "flex", gap: "10px" }}>
                  <img src={pdfIcon} alt="pdf" />
                  <div>
                    {fileState?.name} <br />
                    {fileState?.size && (
                      <small style={{ marginLeft: "-10px" }}>
                        {(fileState.size / 1024).toFixed(2)} KB
                      </small>
                    )}
                  </div>
                </div>
                <Button
                  componentType={"button"}
                  bgColor={"rgba(239, 239, 239, 1)"}
                  borderColor={"rgba(223, 223, 223, 1)"}
                  textColor={"black"}
                  style={{ padding: "7px 7px" }}
                  onClick={removeFile}
                >
                  <img src={trashIcon} alt="trash" />
                </Button>
              </div>
            )}
          </div>
        ) : isDragOver ? (
          <div style={{ color: "rgba(34, 150, 100, 1)" }}>DROP HERE</div>
        ) : (
          <>
            {placeholder && (
              <>
                {placeholder}
                <br />
                <br />
              </>
            )}

            <input
              ref={InputRef}
              type="file"
              accept={acceptedFileTypes}
              onChange={handleSelect}
              style={{ display: "none" }}
              required={required}
            />
            <Button
              componentType="button"
              bgColor="black"
              borderColor="black"
              textColor="white"
              onClick={(e) => {
                e.preventDefault();
                InputRef.current?.click();
              }}
            >
              {buttonLabel}
              <img src={uploadIcon} alt="upload" />
            </Button>
            <br />
            <small>
              {acceptedFileTypes
                .replace(/\./g, "")
                .replace(/,/g, ", ")
                .toUpperCase()}
            </small>
          </>
        )}
      </div>
    </div>
  );
}
