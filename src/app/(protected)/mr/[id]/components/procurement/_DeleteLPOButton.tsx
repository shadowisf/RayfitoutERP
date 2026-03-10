import Button from "@/app/components/Button";
import { toast } from "@/app/components/Toast";

type props = {
  lpoId: number;
  onRefresh?: () => void;
};

export default function DeleteLPOButton({ lpoId, onRefresh }: props) {
  const crossIcon = "/icons/cross-small.svg";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/lpo`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteLpoPDF", id: lpoId }),
      });

      if (res.ok) {
        onRefresh && onRefresh();
      }
    } catch (error) {
      toast("Failed to delete LPO", "error");
    }
  }

  return (
    <Button
      componentType={"button"}
      bgColor={"transparent"}
      borderColor={"transparent"}
      textColor={"black"}
      style={{ padding: "0px" }}
      onClick={handleSubmit}
    >
      <img src={crossIcon} />
    </Button>
  );
}
