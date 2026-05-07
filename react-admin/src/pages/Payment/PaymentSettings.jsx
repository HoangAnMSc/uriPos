import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";

export default function PaymentSettings() {
  const [form, setForm] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    qrImage: "",
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await axiosClient.get("/payment-settings");

    const d = res.data?.data || {};

    setForm({
      bankName: d.bank_name || "",
      accountName: d.account_name || "",
      accountNumber: d.account_number || "",
      qrImage: d.qr_image || "",
    });
  }

  function setField(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function save() {
    try {
      setSaving(true);

      await axiosClient.patch("/payment-settings", {
        bank_name: form.bankName,
        account_name: form.accountName,
        account_number: form.accountNumber,
        qr_image: form.qrImage,
      });

      setMsg("Saved");
    } catch (e) {
      setMsg("Save failed");
    } finally {
      setSaving(false);

      setTimeout(() => setMsg(""), 2000);
    }
  }

  return (
    <div className="psPage">
      <div className="psCard">
        <h2>Payment Settings</h2>

        <div className="psField">
          <label>Bank Name</label>
          <input
            value={form.bankName}
            onChange={(e) => setField("bankName", e.target.value)}
          />
        </div>

        <div className="psField">
          <label>Account Name</label>
          <input
            value={form.accountName}
            onChange={(e) => setField("accountName", e.target.value)}
          />
        </div>

        <div className="psField">
          <label>Account Number</label>
          <input
            value={form.accountNumber}
            onChange={(e) => setField("accountNumber", e.target.value)}
          />
        </div>

        <div className="psField">
          <label>QR Image URL</label>
          <input
            value={form.qrImage}
            onChange={(e) => setField("qrImage", e.target.value)}
          />
        </div>

        <button className="psBtn" onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>

        {msg ? <div className="psMsg">{msg}</div> : null}
      </div>
    </div>
  );
}
