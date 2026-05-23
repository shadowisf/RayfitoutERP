"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import Button from "@/app/components/Button";
import InfoPopUpButton from "@/app/components/_InfoPopUpButton";
import EditSubcontractorButton from "../../components/_EditSubcontractorButton";
import DeleteSubcontractorButton from "../../components/_DeleteSubcontractorButton";
import { useRefresh } from "@/app/context/RefreshContext";

type JobOrderRow = {
  jo_id: number;
  mr_header_id: number;
  mr_number: string;
  due_date: string;
  jo_invoice_file: string | null;
  jo_payment_receipt: string | null;
  invoice_amount: number;
  total_paid: number;
  jo_paid_at: string | null;
  project_name: string | null;
  start_date: string | null;
  end_date: string | null;
};

type SubcontractorDetailClientProps = {
  subcontractor: any;
  jobOrders: JobOrderRow[];
};

export default function SubcontractorDetailClient({
  subcontractor,
  jobOrders: initialJobOrders,
}: SubcontractorDetailClientProps) {
  const { userInfo } = useAuth();
  const router = useRouter();
  const { refresh } = useRefresh();


  const [jobOrders] = useState<JobOrderRow[]>(initialJobOrders);

  const externalLinkIcon = "/icons/external-link.svg";
  const supplierContractIcon = "/icons/supplier-contract.svg";
  const supplierContactPersonIcon = "/icons/supplier-contact-person.svg";
  const supplierBankIcon = "/icons/supplier-bank.svg";
  const supplierTRNIcon = "/icons/supplier-trn.svg";

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-GB");
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <h1>
          <a
            href="/vendor?tab=subcontractors"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            VENDORS & SUBCONTRACTORS
          </a>{" "}
          &gt; {String(subcontractor.name).toUpperCase()}
        </h1>

        {(userInfo?.departmentID === 8 || userInfo?.departmentID === 9) && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <EditSubcontractorButton
              subcontractor={subcontractor}
              onSuccess={() => refresh()}
              iconOnly
            />
            <DeleteSubcontractorButton
              subcontractor={subcontractor}
              onSuccess={() => router.push("/vendor?tab=subcontractors")}
              iconOnly
            />
          </div>
        )}
      </div>

      <br />
      <br />

      {/* Subcontractor Info - Replicated from Vendor Details layout */}
      <div
        style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "25px" }}
      >
        <div
          className="widget-container"
          style={{
            display: "inline-grid",
            gridTemplateColumns: "repeat(3, max-content)",
            columnGap: "50px",
            rowGap: "30px",
          }}
        >
          <div>
            <small> NAME</small>
            <h2>{subcontractor.name}</h2>
          </div>
          <div>
            <small>SUBCONTRACTOR NUMBER</small>
            <h2>SUB-{subcontractor?.id.toString().padStart(5, "0")}</h2>
          </div>
          <div></div>
          <div>
            <small>SCOPE OF WORK</small>
            <h2>{subcontractor.scope_of_work || "-"}</h2>
          </div>
          <div></div>
          <div></div>
          <div>
            <small>CURRENCY</small>
            <h2>{subcontractor.currency || "AED"}</h2>
          </div>
          <div>
            <small>STATUS</small>
            <h2>{subcontractor.status || "Active"}</h2>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr", // 2 equal columns
            gap: "25px",
          }}
        >
          {/* CONTRACT */}
          {/* <div
            className="widget-container"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <img src={supplierContractIcon} alt="contact person" />
              <InfoPopUpButton
                text={
                  <>
                    <div>
                      <small>CONTRACT</small>
                      <h2>
                        {subcontractor.contract ? (
                          <Button
                            componentType={"link"}
                            bgColor={"rgba(239, 239, 239, 1)"}
                            borderColor={"rgba(223, 223, 223, 1)"}
                            textColor={"black"}
                            style={{ padding: "7px 7px" }}
                            href={subcontractor.contract}
                            target="_blank"
                          >
                            <img src={externalLinkIcon} alt="external link" />
                          </Button>
                        ) : (
                          "-"
                        )}
                      </h2>
                    </div>
                    <br />
                    <div>
                      <small>OTHER DOCS</small>
                      <h2>
                        {subcontractor.other_docs ? (
                          <Button
                            componentType={"link"}
                            bgColor={"rgba(239, 239, 239, 1)"}
                            borderColor={"rgba(223, 223, 223, 1)"}
                            textColor={"black"}
                            style={{ padding: "7px 7px" }}
                            href={subcontractor.other_docs}
                            target="_blank"
                          >
                            <img src={externalLinkIcon} alt="external link" />
                          </Button>
                        ) : (
                          "-"
                        )}
                      </h2>
                    </div>
                  </>
                }
                header={"CONTRACT"}
              />
            </div>
            <h2>CONTRACT</h2>
          </div> */}

          {/* CONTACT PERSON - spans full width */}
          <div
            className="widget-container"
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <img src={supplierContactPersonIcon} alt="contact person" />
              <InfoPopUpButton
                text={
                  <>
                    <div>
                      <small>CONTACT PERSON NAME</small>
                      <h2>{subcontractor.contact_person_name || "-"}</h2>
                    </div>
                    <br />
                    <div>
                      <small>PHONE</small>
                      <h2>{subcontractor.phone || "-"}</h2>
                    </div>
                    <br />
                    <div>
                      <small>EMAIL</small>
                      <h2>{subcontractor.email || "-"}</h2>
                    </div>
                    <br />
                    <div>
                      <small>ADDRESS</small>
                      <h2>{subcontractor.address || "-"}</h2>
                    </div>
                  </>
                }
                header={"CONTRACT"}
              />
            </div>
            <h2>CONTACT PERSON</h2>
          </div>

          {/* TRN/TAX DETAILS - left half */}
          <div
            className="widget-container"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <img src={supplierTRNIcon} alt="trn" />
              <InfoPopUpButton
                text={
                  <>
                    <div>
                      <small>TRN / TAX REGISTRATION NUMBER</small>
                      <h2>{subcontractor.trn_number || "-"}</h2>
                    </div>
                    <br />
                    <div>
                      <small>TRN CERTIFICATE</small>
                      <h2>
                        {subcontractor.trn_certificate ? (
                          <Button
                            componentType={"link"}
                            bgColor={"rgba(239, 239, 239, 1)"}
                            borderColor={"rgba(223, 223, 223, 1)"}
                            textColor={"black"}
                            style={{ padding: "7px 7px" }}
                            href={subcontractor.trn_certificate}
                            target="_blank"
                          >
                            <img src={externalLinkIcon} alt="external link" />
                          </Button>
                        ) : (
                          "-"
                        )}
                      </h2>
                    </div>
                    <br />
                    <div>
                      <small>TRADE LICENSE</small>
                      <h2>
                        {subcontractor.trade_license ? (
                          <Button
                            componentType={"link"}
                            bgColor={"rgba(239, 239, 239, 1)"}
                            borderColor={"rgba(223, 223, 223, 1)"}
                            textColor={"black"}
                            style={{ padding: "7px 7px" }}
                            href={subcontractor.trade_license}
                            target="_blank"
                          >
                            <img src={externalLinkIcon} alt="external link" />
                          </Button>
                        ) : (
                          "-"
                        )}
                      </h2>
                    </div>
                  </>
                }
                header={"TRN/TAX DETAILS"}
              />
            </div>
            <h2>TRN/TAX DETAILS</h2>
          </div>

          {/* NOTES - right half */}
          <div
            className="widget-container"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <img src={supplierBankIcon} alt="notes" />
              <InfoPopUpButton
                text={
                  <>
                    <div>
                      <small>BANK NAME</small>
                      <h2>{subcontractor.bank_name || "-"}</h2>
                    </div>
                    <br />
                    <div>
                      <small>ACCOUNT NUMBER</small>
                      <h2>{subcontractor.account_number || "-"}</h2>
                    </div>
                    <br />
                    <div>
                      <small>NOTES</small>
                      <h2>{subcontractor.notes || "-"}</h2>
                    </div>
                  </>
                }
                header={"BANK DETAILS"}
              />
            </div>
            <h2>BANK DETAILS</h2>
          </div>
        </div>
      </div>

      <br />
      <br />
      <br />

      {/* JO History Table - Replicated from Vendor LPO table structure */}
      <h2>ORDER HISTORY</h2>

      <br />

      <table className="items-table two-toned">
        <thead>
          <tr>
            <th>#</th>
            <th>JO NUMBER</th>
            <th>PROJECT</th>
            <th>START DATE</th>
            <th>END DATE</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {jobOrders.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "30px" }}>
                No job orders found for this subcontractor.
              </td>
            </tr>
          ) : (
            jobOrders.map((jo, index) => {
              return (
                <tr key={jo.jo_id}>
                  <td>{index + 1}</td>
                  <td style={{ textWrap: "nowrap" }}>
                    JO-{String(jo.jo_id).padStart(5, "0")}
                  </td>
                  <td>{jo.project_name || "-"}</td>
                  <td>{formatDate(jo.start_date)}</td>
                  <td>{formatDate(jo.end_date)}</td>
                  <td>
                    <Button
                      componentType={"link"}
                      href={`/mr/${jo.jo_id}`}
                      style={{
                        padding: "7px 7px",
                      }}
                      bgColor={"rgba(239, 239, 239, 1)"}
                      borderColor={"rgba(223, 223, 223, 1)"}
                      textColor={"black"}
                    >
                      <img src={externalLinkIcon} alt="view" />
                    </Button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
