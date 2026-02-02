"use client";

/* import Barcode from "react-barcode"; */
import { QRCodeSVG } from "qrcode.react";
import { InventoryItem } from "../../types/inventoryItem";

type QrCodeSectionProps = {
  item: InventoryItem;
};

export default function QrCodeSection({ item }: QrCodeSectionProps) {
  return (
    <div
      style={{
        display: "flex",
        gap: "25px",
        /* justifyContent: "space-between", */
      }}
    >
      {/* <div style={{ marginLeft: "-5px" }}>
        <Barcode
          value={`MRT-${item.id.toString().padStart(5, "0")}`}
          format="CODE128"
          width={1.75}
          height={80}
          displayValue={true}
        />
      </div> */}
      <div /* style={{ marginTop: "10px" }} */>
        <QRCodeSVG
          value={`${process.env.NEXT_PUBLIC_BASE_URL}/inventory/${item.id}`}
          size={125}
        />
      </div>
    </div>
  );
}
