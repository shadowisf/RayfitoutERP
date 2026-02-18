"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import VendorDetailClient from "./components/VendorDetailClient";
import SubcontractorDetailClient from "./components/SubcontractorDetailClient";

export default function VendorDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = Number(params.id);
  const type = searchParams.get("type"); // "subcontractor" or null (default = supplier)

  const [entityData, setEntityData] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      try {
        if (type === "subcontractor") {
          // Fetch subcontractor details + JOs
          const [entityRes, ordersRes] = await Promise.all([
            fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor/getSubcontractorByID`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
              },
            ),
            fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/subcontractor/getJOsBySubcontractorID`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subcontractor_id: id }),
              },
            ),
          ]);

          const entity = await entityRes.json();
          const orderData = await ordersRes.json();

          setEntityData(entity);
          setOrders(orderData);
        } else {
          // Fetch supplier details + LPOs
          const [entityRes, ordersRes] = await Promise.all([
            fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier/getSupplierByID`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
              },
            ),
            fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL}/api/supplier/getLPOsBySupplierID`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ supplier_id: id }),
              },
            ),
          ]);

          const entity = await entityRes.json();
          const orderData = await ordersRes.json();

          setEntityData(entity);
          setOrders(orderData);
        }
      } catch (error) {
        console.error("Error fetching vendor detail:", error);
      }
    }

    fetchData();
  }, [id, type]);

  if (!entityData || entityData.error) {
    return null;
  }

  if (type === "subcontractor") {
    return (
      <SubcontractorDetailClient
        subcontractor={entityData}
        jobOrders={orders}
      />
    );
  }

  return <VendorDetailClient supplier={entityData} lpos={orders} />;
}
