import { View, Image, StyleSheet, Text } from "@react-pdf/renderer";
import { InventoryItem } from "../../types/inventoryItem";

const styles = StyleSheet.create({
  container: {
    /* flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 40, */
  },
  // barcodeContainer: {
  //   marginLeft: -10,
  //   marginTop: 20,
  //   alignItems: "center",
  // },
  qrcodeContainer: {
    display: "flex",
    flexDirection: "row",
    gap: "25px",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  // barcode: {
  //   height: 100,
  // },
  qrcode: {
    marginTop: 50,
    width: 100,
    height: 100,
  },
  small: {
    textTransform: "uppercase",
    fontSize: 14,
    marginBottom: 10,
  },
  smallBold: {
    textTransform: "uppercase",
    fontSize: 14,
    fontFamily: "Mont-SemiBold",
  },
});

type QrCodeSectionPDFProps = {
  // barcodeDataUrl: string;
  qrcodeDataUrl: string;
  inventoryItem: InventoryItem;
};

export default function QrCodeSectionPDF({
  // barcodeDataUrl,
  qrcodeDataUrl,
  inventoryItem,
}: QrCodeSectionPDFProps) {
  return (
    <View style={styles.container}>
      {/* <View style={styles.barcodeContainer}>
        <Image src={barcodeDataUrl} style={styles.barcode} />
      </View> */}
      <View style={styles.qrcodeContainer}>
        <View>
          <Text style={styles.small}>
            {inventoryItem.category_name} / {inventoryItem.subcategory_name}
          </Text>
          <Text style={styles.smallBold}>
            MRT-
            {inventoryItem.id.toString().padStart(5, "0")}
          </Text>
        </View>
        <Image src={qrcodeDataUrl} style={styles.qrcode} />
      </View>
    </View>
  );
}
