"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Button from "./Button";
import { toast } from "./Toast";

type FileSetter =
  | React.Dispatch<React.SetStateAction<File[] | null>>
  | React.Dispatch<React.SetStateAction<File[]>>
  | ((files: File[] | null) => void)
  | ((files: File[]) => void);

type MultipleUploadFileBoxProps = {
  fileState: File[] | null;
  setFileState: FileSetter;
  label: string;
  required?: boolean;
  placeholder?: string;
  acceptedFileTypes: string;
  buttonLabel?: string;
  existingFileUrls?: string[] | null;
  onExistingFilesChange?: (files: string[]) => void;
};

// ✅ Create stable empty set outside component
const EMPTY_SET = new Set<number>();

export default function MultipleUploadFileBox({
  fileState,
  setFileState,
  label,
  required,
  placeholder = "UPLOAD OR DRAG ATTACHMENTS",
  acceptedFileTypes,
  buttonLabel = "UPLOAD FILES",
  existingFileUrls,
  onExistingFilesChange,
}: MultipleUploadFileBoxProps) {
  const pdfIcon = "/icons/pdf.svg";
  const uploadIcon = "/icons/upload.svg";
  const trashIcon = "/icons/trash.svg";

  const [isDragOver, setIsDragOver] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [visibleExistingIndices, setVisibleExistingIndices] =
    useState<Set<number>>(EMPTY_SET);

  const InputRef = useRef<HTMLInputElement | null>(null);

  // ✅ Memoize the initial indices calculation
  const initialIndices = useMemo(() => {
    if (existingFileUrls && existingFileUrls.length > 0) {
      return new Set(existingFileUrls.map((_, i) => i));
    }
    return EMPTY_SET;
  }, [existingFileUrls?.length, existingFileUrls?.join(",")]); // Stable dependencies

  // ✅ Only update state when initialIndices actually changes
  useEffect(() => {
    setVisibleExistingIndices((prev) => {
      // Only update if different size or content
      if (prev.size !== initialIndices.size) {
        return initialIndices;
      }
      // Check if contents are different
      for (const idx of initialIndices) {
        if (!prev.has(idx)) return initialIndices;
      }
      for (const idx of prev) {
        if (!initialIndices.has(idx)) return initialIndices;
      }
      return prev; // Same contents, keep previous reference
    });
  }, [initialIndices]);

  // ✅ Separate effect for notifying parent - with proper cleanup
  const prevVisibleFilesRef = useRef<string>("");

  useEffect(() => {
    if (!onExistingFilesChange || !existingFileUrls) return;

    const visibleFiles = existingFileUrls.filter((_, i) =>
      visibleExistingIndices.has(i),
    );

    // Only notify if actually changed
    const currentJson = JSON.stringify(visibleFiles);
    if (currentJson !== prevVisibleFilesRef.current) {
      prevVisibleFilesRef.current = currentJson;
      onExistingFilesChange(visibleFiles);
    }
  }, [visibleExistingIndices, existingFileUrls, onExistingFilesChange]);

  const updateFileState = (files: File[] | null) => {
    (setFileState as any)(files);
  };

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

    updateFileState(filesArray);
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
    updateFileState(newFiles.length > 0 ? newFiles : null);
    generatePreviews(newFiles);

    if (InputRef.current) {
      InputRef.current.value = "";
    }
  };

  const removeExistingFile = useCallback((index: number) => {
    setVisibleExistingIndices((prev) => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  }, []);

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

    updateFileState(droppedFiles);
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

  const getFileNameFromUrl = (url: string) => {
    const parts = url.split("/");
    return parts[parts.length - 1] || "Existing File";
  };

  const isImageUrl = (url: string) => {
    return url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
  };

  const files = fileState || [];
  const visibleExistingFiles =
    existingFileUrls?.filter((_, i) => visibleExistingIndices.has(i)) || [];
  const hasContent = files.length > 0 || visibleExistingFiles.length > 0;

  return (
    <div className="input-item">
      <label className="custom">
        <span>{label}</span>{" "}
        {!required && (
          <small style={{ fontStyle: "italic", fontWeight: "100" }}>
            OPTIONAL
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
          minHeight: "200px",
        }}
      >
        {hasContent ? (
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {/* New uploaded files */}
            {files.length > 0 &&
              (() => {
                const imageFiles = files.filter((f) =>
                  f.type.startsWith("image/"),
                );
                const nonImageFiles = files.filter(
                  (f) => !f.type.startsWith("image/"),
                );

                return (
                  <>
                    {/* Image files in grid */}
                    {imageFiles.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "25px",
                          flexWrap: "wrap",
                        }}
                      >
                        {imageFiles.map((file, imgIndex) => {
                          const fileIndex = files.indexOf(file);
                          const preview = previews[imgIndex];

                          return (
                            <div
                              key={fileIndex}
                              style={{
                                position: "relative",
                                display: "inline-block",
                              }}
                            >
                              <img
                                src={preview}
                                alt={`Preview ${fileIndex + 1}`}
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
                                onClick={(e) => {
                                  e.preventDefault();
                                  removeFile(fileIndex);
                                }}
                              >
                                <img src={trashIcon} alt="trash" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Non-image files stacked vertically */}
                    {nonImageFiles.map((file) => {
                      const fileIndex = files.indexOf(file);

                      return (
                        <div
                          key={fileIndex}
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
                          <div
                            style={{
                              display: "flex",
                              gap: "10px",
                              alignItems: "center",
                              overflow: "hidden",
                              minWidth: 0,
                            }}
                          >
                            <img
                              src={pdfIcon}
                              alt="file"
                              style={{ flexShrink: 0 }}
                            />
                            <div style={{ minWidth: 0, overflow: "hidden" }}>
                              <div
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: "300px",
                                }}
                              >
                                {file.name}
                              </div>
                              <small>{(file.size / 1024).toFixed(2)} KB</small>
                            </div>
                          </div>
                          <Button
                            componentType={"button"}
                            bgColor={"rgba(239, 239, 239, 1)"}
                            borderColor={"rgba(223, 223, 223, 1)"}
                            textColor={"black"}
                            style={{ padding: "7px 7px", flexShrink: 0 }}
                            onClick={(e) => {
                              e.preventDefault();
                              removeFile(fileIndex);
                            }}
                          >
                            <img src={trashIcon} alt="trash" />
                          </Button>
                        </div>
                      );
                    })}
                  </>
                );
              })()}

            {/* Existing files */}
            {visibleExistingFiles.length > 0 &&
              (() => {
                const imageUrls = visibleExistingFiles.filter(isImageUrl);
                const nonImageUrls = visibleExistingFiles.filter(
                  (url) => !isImageUrl(url),
                );

                return (
                  <>
                    {/* Existing image files in grid */}
                    {imageUrls.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "25px",
                          flexWrap: "wrap",
                        }}
                      >
                        {imageUrls.map((url) => {
                          const originalIndex = existingFileUrls!.indexOf(url);

                          return (
                            <div
                              key={originalIndex}
                              style={{
                                position: "relative",
                                display: "inline-block",
                              }}
                            >
                              <img
                                src={url}
                                alt="Existing file"
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
                                onClick={(e) => {
                                  e.preventDefault();
                                  removeExistingFile(originalIndex);
                                }}
                              >
                                <img src={trashIcon} alt="trash" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Existing non-image files stacked vertically */}
                    {nonImageUrls.map((url) => {
                      const originalIndex = existingFileUrls!.indexOf(url);

                      return (
                        <div
                          key={originalIndex}
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
                          <div
                            style={{
                              display: "flex",
                              gap: "10px",
                              alignItems: "center",
                              overflow: "hidden",
                              minWidth: 0,
                            }}
                          >
                            <img
                              src={pdfIcon}
                              alt="file"
                              style={{ flexShrink: 0 }}
                            />
                            <div style={{ minWidth: 0, overflow: "hidden" }}>
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: "rgba(23, 92, 220, 1)",
                                  textDecoration: "underline",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  display: "block",
                                  maxWidth: "300px",
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {getFileNameFromUrl(url)}
                              </a>
                              <small>Existing file</small>
                            </div>
                          </div>
                          <Button
                            componentType={"button"}
                            bgColor={"rgba(239, 239, 239, 1)"}
                            borderColor={"rgba(223, 223, 223, 1)"}
                            textColor={"black"}
                            style={{ padding: "7px 7px", flexShrink: 0 }}
                            onClick={(e) => {
                              e.preventDefault();
                              removeExistingFile(originalIndex);
                            }}
                          >
                            <img src={trashIcon} alt="trash" />
                          </Button>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
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
            </small>
          </>
        )}
      </div>
    </div>
  );
}
