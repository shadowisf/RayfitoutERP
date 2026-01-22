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
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
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
    marginBottom: 15,
  },
  titleBold: {
    fontFamily: "Mont-SemiBold",
  },
  inventoryImage: {
    marginTop: 15,
    width: 100,
    objectFit: "contain",
  },
  small: {
    textTransform: "uppercase",
    fontSize: 14,
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

  return (
    <Document>
      <Page size={["425", "300"]} style={styles.page}>
        <View style={styles.header}>
          <Image src={logo} style={styles.logo} />
        </View>

        <View>
          <Text style={styles.title}>
            <Text style={styles.titleBold}>{inventoryItem.description}</Text>
          </Text>
        </View>

        {/* Inventory Item Image */}
        {inventoryImageDataUrl && (
          <View style={{ alignItems: "flex-start" }}>
            <Image src={inventoryImageDataUrl} style={styles.inventoryImage} />
          </View>
        )}

        <QrCodeSectionPDF
          qrcodeDataUrl={qrcodeDataUrl}
          inventoryItem={inventoryItem}
        />
      </Page>
    </Document>
  );
}
