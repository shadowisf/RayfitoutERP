"use client";

import { useState, useRef } from "react";
import Button from "./Button";
import { toast } from "./Toast";

type MultipleUploadFileBoxProps = {
  fileState: File[] | null;
  setFileState: React.Dispatch<React.SetStateAction<File[] | null>>;
  label: string;
  required?: boolean;
  placeholder?: string;
  acceptedFileTypes: string;
  buttonLabel?: string;
};

export default function MultipleUploadFileBox({
  fileState,
  setFileState,
  label,
  required,
  placeholder = "UPLOAD OR DRAG ATTACHMENTS",
  acceptedFileTypes,
  buttonLabel = "UPLOAD FILES",
}: MultipleUploadFileBoxProps) {
  const pdfIcon = "/icons/pdf.svg";
  const uploadIcon = "/icons/upload.svg";
  const trashIcon = "/icons/trash.svg";

  const [isDragOver, setIsDragOver] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  const InputRef = useRef<HTMLInputElement | null>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const filesArray = Array.from(selectedFiles);

    for (const file of filesArray) {
      if (file.size > 10 * 1024 * 1024) {
        toast("File size must be less than 10MB", "error");
        return;
      }
    }

    setFileState(filesArray);
    generatePreviews(filesArray);
  };

  const generatePreviews = (files: File[]) => {
    const newPreviews: string[] = [];
    let loadedCount = 0;
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      setPreviews([]);
      return;
    }

    imageFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews[index] = reader.result as string;
        loadedCount++;
        if (loadedCount === imageFiles.length) {
          setPreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    if (!fileState) return;

    const newFiles = fileState.filter((_, i) => i !== index);
    setFileState(newFiles.length > 0 ? newFiles : null);
    generatePreviews(newFiles);

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

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    for (const file of droppedFiles) {
      if (!isAcceptedFileType(file)) {
        toast("Invalid file type", "error");
        return;
      }
    }

    for (const file of droppedFiles) {
      if (file.size > 10 * 1024 * 1024) {
        toast("File size must be less than 10MB", "error");
        return;
      }
    }

    setFileState(droppedFiles);
    generatePreviews(droppedFiles);
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

  const files = fileState || [];
  const hasFiles = files.length > 0;

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
          backgroundColor: isDragOver ? "rgba(169, 255, 218, 1)" : "#f9fafb",
          flexDirection: "column",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
          minHeight: "150px",
        }}
      >
        {hasFiles ? (
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {files.map((file, index) => {
              const isImage = file.type.startsWith("image/");
              const preview = isImage ? previews[index] : null;

              return (
                <div key={index}>
                  {isImage && preview ? (
                    <div
                      style={{ position: "relative", display: "inline-block" }}
                    >
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100px",
                          borderRadius: "5px",
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
                        onClick={(e) => {
                          e.preventDefault();
                          removeFile(index);
                        }}
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
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          alignItems: "center",
                        }}
                      >
                        <img src={pdfIcon} alt="file" />
                        <div>
                          {file.name} <br />
                          <small>{(file.size / 1024).toFixed(2)} KB</small>
                        </div>
                      </div>
                      <Button
                        componentType={"button"}
                        bgColor={"rgba(239, 239, 239, 1)"}
                        borderColor={"rgba(223, 223, 223, 1)"}
                        textColor={"black"}
                        style={{ padding: "7px 7px" }}
                        onClick={(e) => {
                          e.preventDefault();
                          removeFile(index);
                        }}
                      >
                        <img src={trashIcon} alt="trash" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
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
              multiple
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
                .toUpperCase()}{" "}
              (MULTIPLE FILES ALLOWED)
            </small>
          </>
        )}
      </div>
    </div>
  );
}
