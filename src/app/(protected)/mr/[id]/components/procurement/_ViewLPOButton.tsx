"use client";

import Button from "@/app/components/Button";
import DownloadLPOButton from "../../lpo/[lpoId]/components/_DownloadLPOButton";
import EditLPOButton from "./_EditLPOButton";
import { useAuth } from "@/app/context/AuthContext";
import { MrHeader } from "../../types/mrHeader";
import DeleteLPOButton from "./_DeleteLPOButton";

type ViewLPOButtonProps = {
  lpoID: number;
  mrHeader: MrHeader;
  onRefresh?: () => void;
};

export default function ViewLPOButton({
  lpoID,
  mrHeader,
  onRefresh,
}: ViewLPOButtonProps) {
  const { userInfo } = useAuth();

  return (
    <Button
      componentType={"none"}
      bgColor={"white"}
      borderColor={"rgba(207, 207, 207, 1)"}
      textColor={"black"}
      style={{ padding: "7px 20px", borderRadius: "25px" }}
    >
      LPO
      {userInfo?.departmentID === 9 &&
        (mrHeader.progress_id === 12 ||
          mrHeader.progress_id === 13 ||
          mrHeader.progress_id === 16) && (
          <>
            <EditLPOButton lpoId={lpoID} />
            <DeleteLPOButton lpoId={lpoID} onRefresh={onRefresh} />
          </>
        )}
      {/* Pass mr data to DownloadLPOButton if needed, or let it fetch itself */}
      <DownloadLPOButton lpoID={lpoID} />
    </Button>
  );
}
