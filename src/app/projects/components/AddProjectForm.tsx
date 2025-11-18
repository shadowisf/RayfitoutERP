"use client";

import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

type PropertyType = {
  id: number;
  value: string;
};

export default function AddProjectForm() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("in progress");
  const [type, setType] = useState("renovation");
  const [quotedBudget, setQuotedBudget] = useState("");
  const [allocatedBudget, setAllocatedBudget] = useState("");
  const [propertyTypeId, setPropertyTypeId] = useState<number | "">("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);

  // Fetch property types from the API route
  useEffect(() => {
    fetch(`${API_BASE}/api/projects/property_type`)
      .then((res) => res.json())
      .then((data: PropertyType[]) => setPropertyTypes(data))
      .catch((err) => console.error(err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        status,
        type,
        quoted_budget: parseFloat(quotedBudget),
        allocated_budget: parseFloat(allocatedBudget),
        property_type_id: propertyTypeId,
        start_date: startDate || null,
        end_date: endDate || null,
      }),
    });

    if (res.ok) {
      alert("Project added!");
      setName("");
      setQuotedBudget("");
      setAllocatedBudget("");
      setPropertyTypeId("");
      setStartDate("");
      setEndDate("");
    } else {
      alert("Failed to add project");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
      <h2>Add Project</h2>

      <input
        type="text"
        placeholder="Project Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="in progress">In Progress</option>
        <option value="complete">Complete</option>
        <option value="mobilization">Mobilization</option>
      </select>

      <select value={type} onChange={(e) => setType(e.target.value)}>
        <option value="renovation">Renovation</option>
        <option value="new construction">New Construction</option>
      </select>

      <input
        type="number"
        placeholder="Quoted Budget"
        value={quotedBudget}
        onChange={(e) => setQuotedBudget(e.target.value)}
        required
      />

      <input
        type="number"
        placeholder="Allocated Budget"
        value={allocatedBudget}
        onChange={(e) => setAllocatedBudget(e.target.value)}
        required
      />

      {/* Dropdown for Property Type */}
      <select
        value={propertyTypeId}
        onChange={(e) => setPropertyTypeId(parseInt(e.target.value))}
        required
      >
        <option value="">Select Property Type</option>
        {propertyTypes.map((pt) => (
          <option key={pt.id} value={pt.id}>
            {pt.value}
          </option>
        ))}
      </select>

      {/* NEW: DATE INPUTS */}
      <input
        type="date"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        placeholder="Start Date"
      />

      <input
        type="date"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        placeholder="End Date"
      />

      <button type="submit">Add Project</button>
    </form>
  );
}