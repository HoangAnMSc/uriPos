import React, { useCallback, useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { AsyncState, ButtonContent } from "../../components/Loading/Loading";
import useApiResource, { getApiErrorMessage } from "../../hooks/useApiResource";

const EMPTY_FORM = {
  bankName: "",
  accountName: "",
  accountNumber: "",
  qrImage: "",
};

function mapPaymentSettings(response) {
  const data = response?.data?.data || {};

  return {
    bankName: data.bank_name || "",
    accountName: data.account_name || "",
    accountNumber: data.account_number || "",
    qrImage: data.qr_image || "",
  };
}

function toPaymentPayload(form) {
  return {
    bank_name: form.bankName,
    account_name: form.accountName,
    account_number: form.accountNumber,
    qr_image: form.qrImage,
  };
}

export default function PaymentSettings() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const loadPaymentSettings = useCallback(() => axiosClient.get("/payment-settings"), []);
  const {
    data: loadedForm,
    loading,
    error,
    reload,
  } = useApiResource(loadPaymentSettings, {
    initialData: EMPTY_FORM,
    mapData: mapPaymentSettings,
  });

  useEffect(() => {
    setForm(loadedForm);
  }, [loadedForm]);

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    try {
      setSaving(true);
      setMsg("");

      await axiosClient.patch("/payment-settings", toPaymentPayload(form));
      setMsg("Saved");
      await reload();
    } catch (err) {
      setMsg(getApiErrorMessage(err, "Save failed"));
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 2000);
    }
  }

  return (
    <div className="psPage">
      <div className="psCard">
        <h2>Payment Settings</h2>

        <AsyncState loading={loading} error={error} onRetry={reload}>
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
            <ButtonContent loading={saving} loadingText="Saving...">
              Save
            </ButtonContent>
          </button>

          {msg ? <div className="psMsg">{msg}</div> : null}
        </AsyncState>
      </div>
    </div>
  );
}
