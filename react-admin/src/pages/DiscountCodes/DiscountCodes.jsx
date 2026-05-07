import React, { useEffect, useMemo, useState } from "react";
import { InlineLoader } from "../../components/Loading/Loading";
import axiosClient from "../../api/axiosClient";

async function apiFetch(path, options = {}) {
  const method = (options.method || "GET").toLowerCase();
  const body = options.body ? JSON.parse(options.body) : undefined;
  const res = await axiosClient[method](path, body);
  return res.data;
}

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
  });
}

export default function DiscountCodes() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [items, setItems] = useState([]);

  const [create, setCreate] = useState({
    code: "",
    type: "percent",
    value: "",
    minSubtotal: "0",
    maxDiscount: "",
    active: true,
  });

  async function loadAll() {
    setLoading(true);
    setErr("");
    try {
      const res = await apiFetch("/discounts");
      const norm = (res || []).map((d) => ({
        id: d.id,
        code: d.code,
        type: d.type,
        value: Number(d.value || 0),
        minSubtotal: Number(d.minSubtotal ?? d.min_subtotal ?? 0),
        maxDiscount:
          d.maxDiscount === null || d.max_discount === null
            ? null
            : Number(d.maxDiscount ?? d.max_discount),
        active: Boolean(d.active),
      }));
      setItems(norm);
    } catch (e) {
      setErr(e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const preview = useMemo(() => {
    const code = create.code.trim().toUpperCase() || "NEWCODE";
    const type = create.type;
    const value = Number(create.value || 0);
    const minSubtotal = Number(create.minSubtotal || 0);
    const maxDiscount =
      create.maxDiscount === "" ? null : Number(create.maxDiscount || 0);
    return {
      code,
      type,
      value,
      minSubtotal,
      maxDiscount,
      active: create.active,
    };
  }, [create]);

  async function createDiscount() {
    try {
      setErr("");
      const payload = {
        code: create.code.trim().toUpperCase(),
        type: create.type,
        value: Number(create.value || 0),
        minSubtotal: Number(create.minSubtotal || 0),
        maxDiscount:
          create.maxDiscount === "" ? null : Number(create.maxDiscount || 0),
        active: Boolean(create.active),
      };
      if (!payload.code) {
        setErr("Code is required");
        return;
      }
      await apiFetch("/discounts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setCreate({
        code: "",
        type: "percent",
        value: "",
        minSubtotal: "0",
        maxDiscount: "",
        active: true,
      });
      await loadAll();
    } catch (e) {
      setErr(e.message || "Create failed");
    }
  }

  async function patchDiscount(id, patch) {
    try {
      setErr("");
      await apiFetch(`/discounts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await loadAll();
    } catch (e) {
      setErr(e.message || "Update failed");
    }
  }

  async function deleteDiscount(id) {
    try {
      setErr("");
      await apiFetch(`/discounts/${id}`, { method: "DELETE" });
      await loadAll();
    } catch (e) {
      setErr(e.message || "Delete failed");
    }
  }

  if (loading) {
    return (
      <div className="dcWrap">
        <div className="dcCard"><InlineLoader /></div>
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

            {err ? <div className="dcError">{err}</div> : null}

            <div className="dcForm">
              <div className="dcPreview">
                <div className="dcPreviewTitle">Preview</div>
                <div className="dcChip">
                  <div className="dcChipCode">{preview.code}</div>
                  <div className="dcChipMeta">
                    {preview.type === "percent"
                      ? `${preview.value}%`
                      : money(preview.value)}
                    <span className="dcDot">•</span>
                    min {money(preview.minSubtotal)}
                    {preview.maxDiscount != null ? (
                      <>
                        <span className="dcDot">•</span>
                        cap {money(preview.maxDiscount)}
                      </>
                    ) : null}
                    <span className="dcDot">•</span>
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
                      setCreate((s) => ({ ...s, code: e.target.value }))
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
                      setCreate((s) => ({ ...s, type: e.target.value }))
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
                      setCreate((s) => ({ ...s, value: e.target.value }))
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
                      setCreate((s) => ({ ...s, minSubtotal: e.target.value }))
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
                      setCreate((s) => ({ ...s, maxDiscount: e.target.value }))
                    }
                    placeholder="leave blank for no cap"
                  />
                </div>

                <label className="dcCheck">
                  <input
                    type="checkbox"
                    checked={create.active}
                    onChange={(e) =>
                      setCreate((s) => ({ ...s, active: e.target.checked }))
                    }
                  />
                  Active
                </label>
              </div>

              <button className="dcBtn" type="button" onClick={createDiscount}>
                Create
              </button>
            </div>
          </div>

          <div className="dcCard">
            <div className="dcHead">
              <div className="dcTitle">Discount codes</div>
              <div className="dcCount">{items.length}</div>
            </div>

            <div className="dcList">
              {items.map((d) => (
                <div className="dcItem" key={d.id}>
                  <div className="dcItemMain">
                    <div className="dcCode">{d.code}</div>
                    <div className="dcMeta">
                      {d.type === "percent" ? `${d.value}%` : money(d.value)}
                      <span className="dcDot">•</span>
                      min {money(d.minSubtotal)}
                      {d.maxDiscount != null ? (
                        <>
                          <span className="dcDot">•</span>
                          cap {money(d.maxDiscount)}
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="dcActions">
                    <button
                      className="dcBtnSmall"
                      type="button"
                      onClick={() =>
                        patchDiscount(d.id, { active: d.active ? 0 : 1 })
                      }
                    >
                      {d.active ? "Disable" : "Enable"}
                    </button>

                    <button
                      className="dcBtnSmall dcDanger"
                      type="button"
                      onClick={() => deleteDiscount(d.id)}
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
