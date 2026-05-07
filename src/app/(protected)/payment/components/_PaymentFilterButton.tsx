"use client";

import { useState } from "react";
import FormPopUp from "@/app/components/FormPopup";
import Button from "@/app/components/Button";

export type PaymentFilters = {
  selectedVendors: string[];
  selectedPaymentTypes: string[];
  selectedStatuses: string[];
};

export const defaultPaymentFilters: PaymentFilters = {
  selectedVendors: [],
  selectedPaymentTypes: [],
  selectedStatuses: [],
};

type Props = {
  vendors: string[];
  onApplyFilters: (filters: PaymentFilters) => void;
  currentFilters: PaymentFilters;
};

const PAYMENT_TYPE_OPTIONS = ["Cash", "Credit", "Marketplace/Online"];
const STATUS_OPTIONS = ["Paid", "Unpaid"];

export default function PaymentFilterButton({
  vendors,
  onApplyFilters,
  currentFilters,
}: Props) {
  const searchIcon = "/icons/search.svg";
  const filterIcon = "/icons/filter.svg";

  const [isOpen, setIsOpen] = useState(false);
  const [selectedVendors, setSelectedVendors] = useState<string[]>(
    currentFilters.selectedVendors,
  );
  const [selectedPaymentTypes, setSelectedPaymentTypes] = useState<string[]>(
    currentFilters.selectedPaymentTypes,
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    currentFilters.selectedStatuses,
  );
  const [vendorSearch, setVendorSearch] = useState("");

  const handleOpen = () => {
    setSelectedVendors(currentFilters.selectedVendors);
    setSelectedPaymentTypes(currentFilters.selectedPaymentTypes);
    setSelectedStatuses(currentFilters.selectedStatuses);
    setVendorSearch("");
    setIsOpen(true);
  };

  const handleApply = () => {
    onApplyFilters({ selectedVendors, selectedPaymentTypes, selectedStatuses });
    setIsOpen(false);
  };

  const handleReset = () => {
    setSelectedVendors([]);
    setSelectedPaymentTypes([]);
    setSelectedStatuses([]);
    setVendorSearch("");
  };

  // Vendor handlers
  const filteredVendors = vendors.filter((v) =>
    v.toLowerCase().includes(vendorSearch.toLowerCase()),
  );
  const isAllVendorsSelected = selectedVendors.length === vendors.length;

  const handleSelectAllVendors = (checked: boolean) => {
    setSelectedVendors(checked ? [...vendors] : []);
  };
  const handleVendorChange = (vendor: string, checked: boolean) => {
    setSelectedVendors((prev) =>
      checked ? [...prev, vendor] : prev.filter((v) => v !== vendor),
    );
  };

  // Payment type handlers
  const handlePaymentTypeChange = (type: string, checked: boolean) => {
    setSelectedPaymentTypes((prev) =>
      checked ? [...prev, type] : prev.filter((t) => t !== type),
    );
  };

  // Status handlers
  const handleStatusChange = (status: string, checked: boolean) => {
    setSelectedStatuses((prev) =>
      checked ? [...prev, status] : prev.filter((s) => s !== status),
    );
  };

  return (
    <>
      <Button
        componentType="button"
        bgColor="white"
        borderColor="rgba(241, 244, 246, 1)"
        textColor="black"
        onClick={handleOpen}
        style={{ position: "relative", borderRadius: "50px" }}
      >
        FILTER <img src={filterIcon} alt="filter" />
      </Button>

      {isOpen && (
        <FormPopUp
          header="FILTER PAYMENTS"
          setIsOpen={setIsOpen}
          addButtonLabel="CONFIRM"
          handleSubmit={handleApply}
          style={{ minWidth: "550px" }}
          secondButton={
            <Button
              componentType="button"
              bgColor="white"
              borderColor="black"
              textColor="black"
              onClick={handleReset}
            >
              RESET
            </Button>
          }
        >
          {/* VENDOR */}
          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              VENDOR
            </h3>
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "10px",
              }}
            >
              {/* search */}
              <div style={{ position: "relative", marginBottom: "15px" }}>
                <input
                  type="text"
                  placeholder="Search"
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 40px 10px 15px",
                    borderRadius: "8px",
                    border: "1px solid rgba(223, 223, 223, 1)",
                    fontSize: "14px",
                    backgroundColor: "rgba(245, 245, 245, 1)",
                  }}
                />
                <img
                  src={searchIcon}
                  alt="search"
                  style={{
                    position: "absolute",
                    right: "15px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "16px",
                    height: "16px",
                    opacity: 0.5,
                  }}
                />
              </div>

              {/* select all */}
              <div style={{ marginBottom: "10px" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    className="filter-checkbox"
                    checked={isAllVendorsSelected}
                    onChange={(e) => handleSelectAllVendors(e.target.checked)}
                  />
                  <h4>Select All</h4>
                </label>
              </div>

              {/* list */}
              <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                {filteredVendors.map((vendor) => (
                  <div key={vendor} style={{ marginBottom: "10px" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        className="filter-checkbox"
                        checked={selectedVendors.includes(vendor)}
                        onChange={(e) =>
                          handleVendorChange(vendor, e.target.checked)
                        }
                      />
                      <h4>{vendor}</h4>
                    </label>
                  </div>
                ))}
                {filteredVendors.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "20px",
                      color: "#888",
                    }}
                  >
                    No vendors found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PAYMENT TYPE */}
          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              PAYMENT TYPE
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {PAYMENT_TYPE_OPTIONS.map((type) => (
                <label
                  key={type}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    className="filter-checkbox"
                    checked={selectedPaymentTypes.includes(type)}
                    onChange={(e) =>
                      handlePaymentTypeChange(type, e.target.checked)
                    }
                  />
                  <h4>{type}</h4>
                </label>
              ))}
            </div>
          </div>

          {/* STATUS */}
          <div style={{ marginBottom: "10px" }}>
            <h3
              style={{
                marginBottom: "15px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              STATUS
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
              {STATUS_OPTIONS.map((status) => (
                <label
                  key={status}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    className="filter-checkbox"
                    checked={selectedStatuses.includes(status)}
                    onChange={(e) =>
                      handleStatusChange(status, e.target.checked)
                    }
                  />
                  <h4>{status}</h4>
                </label>
              ))}
            </div>
          </div>
        </FormPopUp>
      )}
    </>
  );
}
