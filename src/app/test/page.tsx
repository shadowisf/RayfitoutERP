"use client";

import { PDFViewer } from "@react-pdf/renderer";
import { BoqPDF } from "@/app/(protected)/boq/[id]/components/BoqPDF"; // Adjust path as needed
import { MrHeader } from "@/app/(protected)/mr/[id]/types/mrHeader";
import { MrLine } from "@/app/(protected)/mr/[id]/types/mrLine";

// Sample data for preview
const sampleMrHeader = {
  id: "12345",
  project_name: "Downtown Office Complex",
  purpose_name: "Construction Materials",
};

const sampleMrLines = [
  {
    boq_item_number: "001",
    boq_item_description: "Concrete Mix - Grade 30",
    boq_total_cost: "15000.00",
  },
  {
    boq_item_number: "002",
    boq_item_description: "Steel Reinforcement Bars (12mm)",
    boq_total_cost: "8500.00",
  },
  {
    boq_item_number: "003",
    boq_item_description: "Brick Masonry Work",
    boq_total_cost: "12000.00",
  },
  {
    boq_item_number: "004",
    boq_item_description: "Electrical Wiring & Fixtures",
    boq_total_cost: "6500.00",
  },
  {
    boq_item_number: "005",
    boq_item_description: "Plumbing Materials",
    boq_total_cost: "4200.00",
  },
];

export default function BOQPreviewPage() {
  return (
    <div className="w-full h-screen">
      <PDFViewer width="100%" height="800px">
        <BoqPDF mrHeader={sampleMrHeader} mrLines={sampleMrLines} />
      </PDFViewer>
    </div>
  );
}
