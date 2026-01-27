import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";
import QrCodeSectionPDF from "./QrCodeSectionPDF";
import { InventoryItem } from "../../types/inventoryItem";

Font.register({
  family: "Mont",
  src: "/fonts/Mont-Regular.otf",
});

Font.register({
  family: "Mont-SemiBold",
  src: "/fonts/Mont-SemiBold.otf",
});

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    padding: 20,
    fontFamily: "Mont",
    position: "relative", // ✅ Added for absolute positioning context
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: "contain",
  },
  title: {
    fontSize: 14,
    color: "#000000",
    textTransform: "uppercase",
    marginBottom: 10,
  },
  titleBold: {
    fontFamily: "Mont-SemiBold",
  },
  inventoryImage: {
    marginTop: 10,
    width: 100,
    objectFit: "contain",
  },
  small: {
    textTransform: "uppercase",
    fontSize: 9,
  },
  // ✅ New style for QR code section wrapper
  qrCodeWrapper: {
    position: "absolute",
    bottom: 20, // Same as page padding
    left: 20, // Same as page padding
    right: 20, // Same as page padding
  },
});

type CodePDFProps = {
  inventoryItem: InventoryItem;
  qrcodeDataUrl: string;
  inventoryImageDataUrl: string | null;
};

export function QrCodePDF({
  qrcodeDataUrl,
  inventoryItem,
  inventoryImageDataUrl,
}: CodePDFProps) {
  const logo = "/icons/logo.jpg";

  function calculatePageHeight(item: InventoryItem, hasImage: boolean) {
    const BASE = 120; // header + padding
    const LINE_HEIGHT = 12;
    const MAX_CHARS_PER_LINE = 40;

    const titleLines = Math.ceil(
      (item.description?.length || 0) / MAX_CHARS_PER_LINE,
    );

    const specLines = Math.ceil(
      (item.specification?.length || 0) / MAX_CHARS_PER_LINE,
    );

    const imageHeight = hasImage ? 110 : 0;
    const qrHeight = 90;

    return (
      BASE +
      titleLines * LINE_HEIGHT +
      specLines * LINE_HEIGHT +
      imageHeight +
      qrHeight
    );
  }

  const pageHeight = calculatePageHeight(
    inventoryItem,
    Boolean(inventoryImageDataUrl),
  );

  return (
    <Document>
      <Page size={["425", pageHeight]} style={styles.page}>
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
        </View>

        <View>
          <Text style={styles.title}>
            <Text style={styles.titleBold}>{inventoryItem.description}</Text>
          </Text>

          <Text style={styles.small}>{inventoryItem.specification}</Text>
        </View>

        {/* Inventory Item Image */}
        {inventoryImageDataUrl && (
          <View style={{ alignItems: "flex-start" }}>
            <Image src={inventoryImageDataUrl} style={styles.inventoryImage} />
          </View>
        )}

        {/* ✅ QR Code Section - Always at bottom */}
        <View style={styles.qrCodeWrapper}>
          <QrCodeSectionPDF
            qrcodeDataUrl={qrcodeDataUrl}
            inventoryItem={inventoryItem}
          />
        </View>
      </Page>
    </Document>
  );
}
