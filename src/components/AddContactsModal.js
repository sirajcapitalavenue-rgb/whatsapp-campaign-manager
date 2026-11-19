import React, { useState } from "react";
import { authFetch } from "../services/api";
import {
  FaCloudUploadAlt,
  FaTimes,
  FaPlus,
  FaTrash,
  FaUserPlus,
  FaPaste,
} from "react-icons/fa";

export default function AddContactsModal({ list, onClose, onRefresh }) {
  const [activeTab, setActiveTab] = useState("manual"); // 'manual' | 'paste'
  const [manualRows, setManualRows] = useState([
    { phoneNumber: "", name: "", var1: "" },
  ]);
  const [pastedData, setPastedData] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  if (!list) return null;

  const handleAddManualRow = () => {
    setManualRows([...manualRows, { phoneNumber: "", name: "", var1: "" }]);
  };

  const handleRemoveManualRow = (idx) => {
    if (manualRows.length <= 1) return;
    setManualRows(manualRows.filter((_, i) => i !== idx));
  };

  const handleManualChange = (idx, field, val) => {
    const updated = [...manualRows];
    updated[idx][field] = val;
    setManualRows(updated);
  };

  // Smart parser for pasted data (handles tab-separated or comma-separated, with or without header row)
  const parsePastedContacts = (rawText) => {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return [];

    // Detect delimiter: tab first, otherwise comma
    const delimiter = lines[0].includes("\t") ? "\t" : ",";
    const firstParts = lines[0].split(delimiter).map((p) => p.trim());

    // Check if the first row looks like a header row (contains "phone" or "name" or non-numeric first column)
    const firstColLower = (firstParts[0] || "").toLowerCase();
    const looksLikeHeader =
      firstColLower.includes("phone") ||
      firstColLower.includes("number") ||
      firstColLower.includes("mobile") ||
      firstColLower === "name" ||
      !/\d{6,}/.test(firstParts[0]);

    if (looksLikeHeader) {
      if (lines.length < 2) return [];
      const headers = firstParts.map((h, idx) => {
        const lower = h.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (
          lower === "phonenumber" ||
          lower === "phone" ||
          lower === "mobile" ||
          lower === "number" ||
          lower === "whatsapp"
        ) {
          return "phoneNumber";
        }
        if (lower === "name" || lower === "fullname" || lower === "contactname") {
          return "name";
        }
        return h || `var${idx}`;
      });

      return lines
        .slice(1)
        .map((line) => {
          const values = line.split(delimiter).map((v) => v.trim());
          const contact = {};
          headers.forEach((header, idx) => {
            if (values[idx] !== undefined && values[idx] !== "") {
              contact[header] = values[idx];
            }
          });
          return contact;
        })
        .filter((c) => c.phoneNumber);
    } else {
      // No header row: assume column 0 = phoneNumber, column 1 = name, column 2+ = var1, var2...
      return lines
        .map((line) => {
          const values = line.split(delimiter).map((v) => v.trim());
          const contact = {
            phoneNumber: values[0] || "",
            name: values[1] || "",
          };
          values.slice(2).forEach((v, idx) => {
            if (v) contact[`var${idx + 1}`] = v;
          });
          return contact;
        })
        .filter((c) => c.phoneNumber);
    }
  };

  const handleUpload = async () => {
    let contacts = [];

    if (activeTab === "manual") {
      contacts = manualRows
        .filter((r) => r.phoneNumber && r.phoneNumber.trim() !== "")
        .map((r) => {
          const item = {
            phoneNumber: r.phoneNumber.trim(),
            name: r.name ? r.name.trim() : "",
          };
          if (r.var1 && r.var1.trim() !== "") {
            item.var1 = r.var1.trim();
          }
          return item;
        });

      if (contacts.length === 0) {
        return alert("Please enter at least one phone number.");
      }
    } else {
      if (!pastedData.trim()) {
        return alert("Please paste contacts data to upload.");
      }
      contacts = parsePastedContacts(pastedData);
      if (contacts.length === 0) {
        return alert(
          "Could not find valid phone numbers. Please paste rows as 'phoneNumber  name' or include a 'phoneNumber  name' header row."
        );
      }
    }

    setIsUploading(true);
    try {
      const result = await authFetch(`/contacts/lists/${list._id}/bulk-add`, {
        method: "POST",
        body: JSON.stringify({ contacts }),
      });

      if (result.success) {
        alert(result.message || "Contacts added successfully!");
        if (onRefresh) onRefresh();
        onClose();
      } else {
        alert(result.message || result.error || "Failed to add contacts.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 transform transition-all overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-200 bg-gray-50/60">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Add Contacts</h3>
            <p className="text-gray-500 text-sm mt-0.5">
              Target List:{" "}
              <span className="text-emerald-600 font-semibold">{list.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "manual"
                ? "border-emerald-600 text-emerald-700 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <FaUserPlus /> Quick Add Contacts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("paste")}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "paste"
                ? "border-emerald-600 text-emerald-700 bg-white"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            <FaPaste /> Bulk Paste (Excel / CSV)
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto">
          {activeTab === "manual" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase px-1">
                <div className="col-span-5">Phone Number (with country code) *</div>
                <div className="col-span-4">Contact Name</div>
                <div className="col-span-2">Custom Var</div>
                <div className="col-span-1"></div>
              </div>

              {manualRows.map((row, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <input
                      type="text"
                      placeholder="e.g. 971501234567"
                      value={row.phoneNumber}
                      onChange={(e) =>
                        handleManualChange(idx, "phoneNumber", e.target.value)
                      }
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg p-2.5 focus:border-emerald-500 focus:bg-white outline-none"
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={row.name}
                      onChange={(e) =>
                        handleManualChange(idx, "name", e.target.value)
                      }
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg p-2.5 focus:border-emerald-500 focus:bg-white outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Optional"
                      value={row.var1}
                      onChange={(e) =>
                        handleManualChange(idx, "var1", e.target.value)
                      }
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg p-2.5 focus:border-emerald-500 focus:bg-white outline-none"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveManualRow(idx)}
                      disabled={manualRows.length <= 1}
                      className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-30 transition-colors"
                      title="Remove row"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAddManualRow}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-lg transition-colors"
                >
                  <FaPlus size={11} /> Add Another Row
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 mb-4 text-xs text-emerald-900 space-y-1">
                <p>
                  <strong>Easy Paste from Excel or CSV:</strong> Copy columns from Excel (tab-separated) or paste comma-separated lines.
                </p>
                <p className="text-emerald-700">
                  Works with or without headers! Format:{" "}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                    phoneNumber &nbsp; name &nbsp; var1
                  </code>{" "}
                  or directly{" "}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-emerald-200">
                    971501234567, John Doe
                  </code>
                </p>
              </div>

              <textarea
                className="w-full bg-gray-50 text-gray-900 p-4 rounded-lg border border-gray-200 focus:border-emerald-500 focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-mono text-sm"
                rows="9"
                placeholder={`phoneNumber\tname\tvar1\n971500000000\tJohn Doe\tvalue1\n971501112222\tSara Ali\tvalue2`}
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
              ></textarea>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-200 bg-gray-50/60 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 font-medium transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            {isUploading ? (
              "Saving Contacts..."
            ) : (
              <>
                <FaCloudUploadAlt size={16} /> Save Contacts to List
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
