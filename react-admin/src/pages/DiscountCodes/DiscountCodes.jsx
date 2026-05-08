import React, { useCallback, useMemo, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { ButtonContent, InlineLoader } from "../../components/Loading/Loading";
import useApiResource, { getApiErrorMessage } from "../../hooks/useApiResource";

const EMPTY_CREATE = {
  code: "",
  type: "percent",
  value: "",
  minSubtotal: "0",
  maxDiscount: "",
  active: true,
};

function money(value) {
  return Number(value || 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
  });
}

function getRows(response) {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
}

function normalizeDiscount(row) {
  const maxDiscount = row?.maxDiscount ?? row?.max_discount;

  return {
    id: row?.id,
    code: row?.code || "",
    type: row?.type || "percent",
    value: Number(row?.value || 0),
    minSubtotal: Number(row?.minSubtotal ?? row?.min_subtotal ?? 0),
    maxDiscount: maxDiscount == null ? null : Number(maxDiscount),
    active: Boolean(row?.active),
  };
}

function toDiscountPayload(form) {
  return {
    code: form.code.trim().toUpperCase(),
    type: form.type,
    value: Number(form.value || 0),
    minSubtotal: Number(form.minSubtotal || 0),
    maxDiscount: form.maxDiscount === "" ? null : Number(form.maxDiscount || 0),
    active: Boolean(form.active),
  };
}

export default function DiscountCodes() {
  const [create, setCreate] = useState(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadDiscounts = useCallback(async () => {
    const response = await axiosClient.get("/discounts");
    return getRows(response).map(normalizeDiscount);
  }, []);

  const {
    data: items,
    loading,
    error,
    setError,
    reload,
  } = useApiResource(loadDiscounts, { initialData: [] });

  const preview = useMemo(() => {
    const payload = toDiscountPayload(create);

    return {
      ...payload,
      code: payload.code || "NEWCODE",
    };
  }, [create]);

  async function createDiscount() {
    const payload = toDiscountPayload(create);

    if (!payload.code) {
      setError("Code is required");
      return;
    }

    try {
      setCreating(true);
      setError("");
      await axiosClient.post("/discounts", payload);
      setCreate(EMPTY_CREATE);
      await reload();
    } catch (err) {
      setError(getApiErrorMessage(err, "Create failed"));
    } finally {
      setCreating(false);
    }
  }

  async function patchDiscount(id, patch) {
    try {
      setBusyId(id);
      setError("");
      await axiosClient.patch(`/discounts/${id}`, patch);
      await reload();
    } catch (err) {
      setError(getApiErrorMessage(err, "Update failed"));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteDiscount(id) {
    try {
      setBusyId(id);
      setError("");
      await axiosClient.delete(`/discounts/${id}`);
      await reload();
    } catch (err) {
      setError(getApiErrorMessage(err, "Delete failed"));
    } finally {
      setBusyId(null);
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="dcWrap">
        <div className="dcCard">
          <InlineLoader />
        </div>
      </div>
    );
  }

  return (
    <div className="dcWrap">
      <div className="dcContainer">
        <div className="dcGrid">
          <div className="dcCard">
            <div className="dcHead">
              <div className="dcTitle">Create discount code</div>
            </div>

            {error ? <div className="dcError">{error}</div> : null}

            <div className="dcForm">
              <div className="dcPreview">
                <div className="dcPreviewTitle">Preview</div>
                <div className="dcChip">
                  <div className="dcChipCode">{preview.code}</div>
                  <div className="dcChipMeta">
                    {preview.type === "percent"
                      ? `${preview.value}%`
                      : money(preview.value)}
                    <span className="dcDot">-</span>
                    min {money(preview.minSubtotal)}
                    {preview.maxDiscount != null ? (
                      <>
                        <span className="dcDot">-</span>
                        cap {money(preview.maxDiscount)}
                      </>
                    ) : null}
                    <span className="dcDot">-</span>
                    {preview.active ? "active" : "inactive"}
                  </div>
                </div>
              </div>

              <div className="dcRow">
                <div className="dcField">
                  <div className="dcLabel">Code</div>
                  <input
                    className="dcInput"
                    value={create.code}
                    onChange={(e) =>
                      setCreate((current) => ({ ...current, code: e.target.value }))
                    }
                    placeholder="SAVE10"
                  />
                </div>
                <div className="dcField">
                  <div className="dcLabel">Type</div>
                  <select
                    className="dcSelect"
                    value={create.type}
                    onChange={(e) =>
                      setCreate((current) => ({ ...current, type: e.target.value }))
                    }
                  >
                    <option value="percent">percent</option>
                    <option value="fixed">fixed</option>
                  </select>
                </div>
              </div>

              <div className="dcRow">
                <div className="dcField">
                  <div className="dcLabel">Value</div>
                  <input
                    className="dcInput"
                    type="number"
                    value={create.value}
                    onChange={(e) =>
                      setCreate((current) => ({ ...current, value: e.target.value }))
                    }
                  />
                </div>
                <div className="dcField">
                  <div className="dcLabel">Min subtotal</div>
                  <input
                    className="dcInput"
                    type="number"
                    value={create.minSubtotal}
                    onChange={(e) =>
                      setCreate((current) => ({
                        ...current,
                        minSubtotal: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="dcRow">
                <div className="dcField">
                  <div className="dcLabel">Max discount (optional)</div>
                  <input
                    className="dcInput"
                    type="number"
                    value={create.maxDiscount}
                    onChange={(e) =>
                      setCreate((current) => ({
                        ...current,
                        maxDiscount: e.target.value,
                      }))
                    }
                    placeholder="leave blank for no cap"
                  />
                </div>

                <label className="dcCheck">
                  <input
                    type="checkbox"
                    checked={create.active}
                    onChange={(e) =>
                      setCreate((current) => ({
                        ...current,
                        active: e.target.checked,
                      }))
                    }
                  />
                  Active
                </label>
              </div>

              <button
                className="dcBtn"
                type="button"
                onClick={createDiscount}
                disabled={creating}
              >
                <ButtonContent loading={creating} loadingText="Creating...">
                  Create
                </ButtonContent>
              </button>
            </div>
          </div>

          <div className="dcCard">
            <div className="dcHead">
              <div className="dcTitle">Discount codes</div>
              <div className="dcCount">{items.length}</div>
            </div>

            <div className="dcList">
              {items.map((discount) => (
                <div className="dcItem" key={discount.id}>
                  <div className="dcItemMain">
                    <div className="dcCode">{discount.code}</div>
                    <div className="dcMeta">
                      {discount.type === "percent"
                        ? `${discount.value}%`
                        : money(discount.value)}
                      <span className="dcDot">-</span>
                      min {money(discount.minSubtotal)}
                      {discount.maxDiscount != null ? (
                        <>
                          <span className="dcDot">-</span>
                          cap {money(discount.maxDiscount)}
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="dcActions">
                    <button
                      className="dcBtnSmall"
                      type="button"
                      disabled={busyId === discount.id}
                      onClick={() =>
                        patchDiscount(discount.id, {
                          active: !discount.active,
                        })
                      }
                    >
                      {discount.active ? "Disable" : "Enable"}
                    </button>

                    <button
                      className="dcBtnSmall dcDanger"
                      type="button"
                      disabled={busyId === discount.id}
                      onClick={() => deleteDiscount(discount.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {items.length === 0 ? (
                <div className="dcEmpty">No discount codes.</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
