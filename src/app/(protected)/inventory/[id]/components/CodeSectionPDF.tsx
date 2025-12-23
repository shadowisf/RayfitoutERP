import { View, Image, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 40,
  },
  barcodeContainer: {
    marginLeft: -10,
    marginTop: 20,
    alignItems: "center",
  },
  qrcodeContainer: {
    alignItems: "center",
  },
  barcode: {
    height: 100,
  },
  qrcode: {
    height: 65,
  },
});

type CodeSectionPDFProps = {
  barcodeDataUrl: string;
  qrcodeDataUrl: string;
};

export default function CodeSectionPDF({
  barcodeDataUrl,
  qrcodeDataUrl,
}: CodeSectionPDFProps) {
  return (
    <View style={styles.container}>
      <View style={styles.barcodeContainer}>
        <Image src={barcodeDataUrl} style={styles.barcode} />
      </View>
      <View style={styles.qrcodeContainer}>
        <Image src={qrcodeDataUrl} style={styles.qrcode} />
      </View>
    </View>
  );
}
