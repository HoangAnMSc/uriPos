import { useEffect, useMemo, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { useMsg } from "../../components/MsgContext/MsgContext";
import { SkeletonTableRows } from "../../components/Loading/Loading";
import {
  normalizeCustomerRankRules,
  resolveCustomerRankName,
  sanitizeRankPoints,
} from "../../utils/customerRanks";

const emptyForm = {
  name: "",
  phone: "",
  address: "",
  loyalty_points: "0",
};

function buildCustomerPayload(form) {
  return {
    name: String(form.name || "").trim(),
    phone: String(form.phone || "").replace(/[^0-9]/g, ""),
    address: String(form.address || "").trim(),
    loyalty_points: sanitizeRankPoints(form.loyalty_points),
  };
}

function formatWholeNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(sanitizeRankPoints(value));
}

function createNextRankRule(rules = []) {
  const normalized = normalizeCustomerRankRules(rules);
  const lastRule = normalized[normalized.length - 1];

  return {
    name: "",
    min_points: lastRule ? sanitizeRankPoints(lastRule.min_points) + 100 : 0,
  };
}

function RuleSummary({ rules }) {
  if (!rules.length) {
    return (
      <span style={{ color: "var(--text-3, #8e8e93)" }}>
        Chua co cau hinh hang.
      </span>
    );
  }

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {rules.map((rule) => (
        <span
          key={`${rule.name}-${rule.min_points}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: "999px",
            background: "var(--bg-1, #ffffff)",
            color: "var(--text-1, #1c1c1e)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <span>{rule.name}</span>
          <span style={{ color: "var(--text-3, #8e8e93)" }}>
            tu {rule.min_points} diem
          </span>
        </span>
      ))}
    </div>
  );
}

export default function Customer() {
  const { showSuccess, showDanger } = useMsg();

  const [customers, setCustomers] = useState([]);
  const [rankRules, setRankRules] = useState([]);
  const [rankDrafts, setRankDrafts] = useState([]);
  const [pointExchangeAmount, setPointExchangeAmount] = useState(0);
  const [pointExchangeDraft, setPointExchangeDraft] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [rankSaving, setRankSaving] = useState(false);
  const [pointSaving, setPointSaving] = useState(false);
  const [openCustomerPopup, setOpenCustomerPopup] = useState(false);
  const [openRankPopup, setOpenRankPopup] = useState(false);
  const [openPointPopup, setOpenPointPopup] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    void loadPage();
  }, []);

  const currentRankPreview = useMemo(
    () => resolveCustomerRankName(form.loyalty_points, rankRules),
    [form.loyalty_points, rankRules],
  );

  async function loadPage() {
    setPageLoading(true);

    try {
      await Promise.all([fetchCustomers(), fetchCustomerSettings()]);
    } catch (error) {
      console.error("Load customer page failed", error);
      showDanger("Khong tai duoc du lieu khach hang");
    } finally {
      setPageLoading(false);
    }
  }

  async function fetchCustomers() {
    const res = await axiosClient.get("/customers");
    const list = res.data?.data?.data || res.data?.data || [];
    setCustomers(Array.isArray(list) ? list : []);
  }

  async function fetchCustomerSettings() {
    const res = await axiosClient.get("/customers/rank-settings");
    const nextRules = normalizeCustomerRankRules(res.data?.data?.rules || []);
    const nextPointAmount = sanitizeRankPoints(
      res.data?.data?.point_exchange_amount,
    );

    setRankRules(nextRules);
    setPointExchangeAmount(nextPointAmount);
  }

  function openCreatePopup() {
    setEditingId(null);
    setErrors({});
    setForm(emptyForm);
    setOpenCustomerPopup(true);
  }

  function openEditPopup(customer) {
    setEditingId(customer.id);
    setErrors({});
    setForm({
      name: customer.name || "",
      phone: customer.phone || "",
      address: customer.address || "",
      loyalty_points: String(customer.loyalty_points ?? 0),
    });
    setOpenCustomerPopup(true);
  }

  function closeCustomerPopup() {
    setOpenCustomerPopup(false);
    setEditingId(null);
    setErrors({});
    setForm(emptyForm);
  }

  function openRankSettingsPopup() {
    setRankDrafts(rankRules.map((rule) => ({ ...rule })));
    setOpenRankPopup(true);
  }

  function closeRankSettingsPopup() {
    setOpenRankPopup(false);
    setRankDrafts([]);
  }

  function openPointSettingsPopup() {
    setPointExchangeDraft(
      pointExchangeAmount > 0 ? String(pointExchangeAmount) : "",
    );
    setOpenPointPopup(true);
  }

  function closePointSettingsPopup() {
    setOpenPointPopup(false);
    setPointExchangeDraft("");
  }

  function handleBaseChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: undefined,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const payload = buildCustomerPayload(form);
      const duplicatePhone = customers.some(
        (customer) => customer.phone === payload.phone && customer.id !== editingId,
      );

      if (!payload.name) {
        showDanger("Vui long nhap ten khach hang");
        return;
      }

      if (!/^[0-9]{10}$/.test(payload.phone)) {
        showDanger("So dien thoai phai gom dung 10 chu so");
        return;
      }

      if (duplicatePhone) {
        setErrors((previous) => ({
          ...previous,
          phone: ["So dien thoai da ton tai"],
        }));
        showDanger("So dien thoai da ton tai");
        return;
      }

      if (editingId) {
        await axiosClient.patch(`/customers/${editingId}`, payload);
        showSuccess("Cap nhat khach hang thanh cong");
      } else {
        await axiosClient.post("/customers", payload);
        showSuccess("Them moi khach hang thanh cong");
      }

      closeCustomerPopup();
      await fetchCustomers();
    } catch (error) {
      if (error.response?.status === 422) {
        setErrors(error.response.data?.errors || {});
        showDanger(
          error.response.data?.errors?.phone?.[0] || "Du lieu chua hop le",
        );
      } else {
        showDanger("Co loi xay ra khi luu khach hang");
      }

      console.error("Save customer failed", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    const ok = window.confirm("Ban co chac muon xoa khach hang nay khong?");
    if (!ok) return;

    try {
      await axiosClient.delete(`/customers/${id}`);
      await fetchCustomers();
      showSuccess("Xoa khach hang thanh cong");
    } catch (error) {
      console.error("Delete customer failed", error);
      showDanger("Co loi xay ra khi xoa khach hang");
    }
  }

  function handleRankRuleChange(index, key, value) {
    setRankDrafts((previous) =>
      previous.map((rule, ruleIndex) =>
        ruleIndex !== index
          ? rule
          : {
              ...rule,
              [key]: key === "min_points" ? sanitizeRankPoints(value) : value,
            },
      ),
    );
  }

  function addRankRule() {
    setRankDrafts((previous) => [...previous, createNextRankRule(previous)]);
  }

  function removeRankRule(index) {
    setRankDrafts((previous) => {
      if (previous.length <= 1) {
        showDanger("Can giu lai it nhat mot hang khach hang");
        return previous;
      }

      return previous.filter((_, ruleIndex) => ruleIndex !== index);
    });
  }

  async function handleSaveRankSettings() {
    setRankSaving(true);

    try {
      const payloadRules = rankDrafts.map((rule) => ({
        name: String(rule.name || "").trim(),
        min_points: sanitizeRankPoints(rule.min_points),
      }));

      if (payloadRules.length === 0) {
        showDanger("Can co it nhat mot hang khach hang");
        return;
      }

      if (payloadRules.some((rule) => !rule.name)) {
        showDanger("Vui long nhap ten cho tat ca hang khach hang");
        return;
      }

      if (!payloadRules.some((rule) => rule.min_points === 0)) {
        showDanger("Can co it nhat mot hang bat dau tu 0 diem");
        return;
      }

      const uniquePointCount = new Set(payloadRules.map((rule) => rule.min_points)).size;
      if (uniquePointCount !== payloadRules.length) {
        showDanger("Moi hang phai co mot moc diem khac nhau");
        return;
      }

      const res = await axiosClient.patch("/customers/rank-settings", {
        rules: payloadRules,
      });

      const nextRules = normalizeCustomerRankRules(res.data?.data?.rules || []);
      setRankRules(nextRules);
      setRankDrafts([]);
      setOpenRankPopup(false);
      await fetchCustomers();
      showSuccess("Da luu cau hinh hang khach hang");
    } catch (error) {
      console.error("Save rank settings failed", error);
      showDanger(
        error.response?.data?.errors?.rules?.[0] ||
          error.response?.data?.message ||
          "Khong the luu cau hinh hang khach hang",
      );
    } finally {
      setRankSaving(false);
    }
  }

  async function handleSavePointSettings() {
    setPointSaving(true);

    try {
      const amount = sanitizeRankPoints(pointExchangeDraft);

      if (amount < 1) {
        showDanger("Vui long nhap so tien hop le de cong 1 diem");
        return;
      }

      const res = await axiosClient.patch("/customers/point-settings", {
        point_exchange_amount: amount,
      });

      const nextAmount = sanitizeRankPoints(
        res.data?.data?.point_exchange_amount,
      );

      setPointExchangeAmount(nextAmount);
      closePointSettingsPopup();
      showSuccess("Da luu cau hinh tang diem");
    } catch (error) {
      console.error("Save point settings failed", error);
      showDanger(
        error.response?.data?.errors?.point_exchange_amount?.[0] ||
          error.response?.data?.message ||
          "Khong the luu cau hinh tang diem",
      );
    } finally {
      setPointSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Khach hang</h2>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            className="btn_edit"
            type="button"
            onClick={openPointSettingsPopup}
          >
            Cai dat tang diem
          </button>
          <button
            className="btn_edit"
            type="button"
            onClick={openRankSettingsPopup}
          >
            Cai dat hang
          </button>
          <button className="btn_add" type="button" onClick={openCreatePopup}>
            Them moi khach hang
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div
          className="card-body"
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          <div
            style={{
              display: "grid",
              gap: 14,
              padding: 18,
              borderRadius: "var(--r-lg, 16px)",
              background: "var(--bg-2, #f5f5f7)",
            }}
          >
            <div>
              <h3 style={{ margin: 0, marginBottom: 6 }}>Cau hinh hang hien tai</h3>
              <p style={{ margin: 0, color: "var(--text-2, #5c5c62)" }}>
                Hang duoc tinh tu dong theo diem tich luy. Nhan nut "Cai dat hang"
                de thay doi moc diem va ten hang.
              </p>
            </div>

            <RuleSummary rules={rankRules} />
          </div>

          <div
            style={{
              display: "grid",
              gap: 14,
              padding: 18,
              borderRadius: "var(--r-lg, 16px)",
              background: "var(--bg-2, #f5f5f7)",
            }}
          >
            <div>
              <h3 style={{ margin: 0, marginBottom: 6 }}>Cau hinh tang diem</h3>
              <p style={{ margin: 0, color: "var(--text-2, #5c5c62)" }}>
                He thong cong diem khi tao don thanh cong o POS va don co gan
                khach hang.
              </p>
            </div>

            <div
              style={{
                padding: "14px 16px",
                borderRadius: "var(--r-md, 12px)",
                background: "var(--bg-1, #ffffff)",
                color: "var(--text-1, #1c1c1e)",
                fontWeight: 700,
              }}
            >
              {pointExchangeAmount > 0
                ? `Mua ${formatWholeNumber(pointExchangeAmount)} se duoc 1 diem`
                : "Chua co cau hinh tang diem"}
            </div>
          </div>
        </div>
      </div>

      {pageLoading ? (
        <div className="card-table">
          <table>
            <thead>
              <tr>
                <th>Ten khach hang</th>
                <th>So dien thoai</th>
                <th>Dia chi</th>
                <th>Diem tich luy</th>
                <th>Hang</th>
                <th>Hanh dong</th>
              </tr>
            </thead>
            <tbody>
              <SkeletonTableRows rows={5} cols={6} />
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card-table">
          <table>
            <thead>
              <tr>
                <th>Ten khach hang</th>
                <th>So dien thoai</th>
                <th>Dia chi</th>
                <th>Diem tich luy</th>
                <th>Hang</th>
                <th>Hanh dong</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="6" align="center">
                    Danh sach khach hang hien dang trong
                  </td>
                </tr>
              ) : (
                customers.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.phone}</td>
                    <td>{item.address || "-"}</td>
                    <td>{sanitizeRankPoints(item.loyalty_points)}</td>
                    <td>{item.rank || resolveCustomerRankName(item.loyalty_points, rankRules)}</td>
                    <td>
                      <button
                        className="btn_edit"
                        type="button"
                        onClick={() => openEditPopup(item)}
                      >
                        Sua
                      </button>
                      <button
                        className="btn_delete"
                        type="button"
                        onClick={() => handleDelete(item.id)}
                      >
                        Xoa
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {openPointPopup && (
        <div className="card-popup" onClick={closePointSettingsPopup}>
          <div className="popup-sm" onClick={(event) => event.stopPropagation()}>
            <div className="popup-header">
              <h3 className="popup-title">Cai dat tang diem</h3>
              <button type="button" onClick={closePointSettingsPopup}>
                Dong
              </button>
            </div>

            <div className="popup-body" style={{ display: "grid", gap: 14 }}>
              <p style={{ margin: 0, color: "var(--text-2, #5c5c62)" }}>
                Nhap so tien chi tieu de he thong cong 1 diem. Vi du: nhap 1000
                nghia la mua 1000 se duoc 1 diem.
              </p>

              <div className="popup-field">
                <label className="popup-label">So tien cho 1 diem</label>
                <input
                  className="popup-input"
                  type="number"
                  min="1"
                  value={pointExchangeDraft}
                  onChange={(event) =>
                    setPointExchangeDraft(
                      event.target.value.replace(/[^0-9]/g, ""),
                    )
                  }
                  placeholder="Vi du: 1000"
                />
              </div>

              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "var(--r-md, 12px)",
                  background: "var(--bg-2, #f5f5f7)",
                  color: "var(--text-1, #1c1c1e)",
                  fontWeight: 700,
                }}
              >
                {sanitizeRankPoints(pointExchangeDraft) > 0
                  ? `Preview: mua ${formatWholeNumber(pointExchangeDraft)} se duoc 1 diem`
                  : "Nhap moc chi tieu hop le"}
              </div>

              <div className="popup-footer">
                <button type="button" onClick={closePointSettingsPopup}>
                  Huy
                </button>
                <button
                  className="btn_success"
                  type="button"
                  onClick={handleSavePointSettings}
                  disabled={pointSaving}
                >
                  {pointSaving ? "Dang luu..." : "Luu cau hinh"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {openCustomerPopup && (
        <div className="card-popup" onClick={closeCustomerPopup}>
          <div className="popup-sm" onClick={(event) => event.stopPropagation()}>
            <div className="popup-header">
              <h3 className="popup-title">
                {editingId ? "Chinh sua khach hang" : "Tao khach hang"}
              </h3>
              <button type="button" onClick={closeCustomerPopup}>
                Dong
              </button>
            </div>

            <form onSubmit={handleSubmit} className="popup-body">
              <div className="popup-field">
                <label className="popup-label">Ten khach hang</label>
                <input
                  className="popup-input"
                  name="name"
                  value={form.name}
                  onChange={handleBaseChange}
                  placeholder="Nhap ten khach hang"
                />
                {errors.name?.[0] && (
                  <div className="popup-error">{errors.name[0]}</div>
                )}
              </div>

              <div className="popup-field">
                <label className="popup-label">So dien thoai</label>
                <input
                  className="popup-input"
                  name="phone"
                  value={form.phone}
                  onChange={(event) => {
                    const value = event.target.value.replace(/[^0-9]/g, "").slice(0, 10);
                    handleBaseChange({ target: { name: "phone", value } });
                  }}
                  placeholder="Nhap so dien thoai"
                />
                {errors.phone?.[0] && (
                  <div className="popup-error">{errors.phone[0]}</div>
                )}
              </div>

              <div className="popup-field">
                <label className="popup-label">Dia chi</label>
                <textarea
                  className="popup-textarea"
                  name="address"
                  value={form.address}
                  onChange={handleBaseChange}
                  placeholder="Nhap dia chi khach hang"
                />
                {errors.address?.[0] && (
                  <div className="popup-error">{errors.address[0]}</div>
                )}
              </div>

              <div className="popup-field">
                <label className="popup-label">Diem tich luy</label>
                <input
                  className="popup-input"
                  type="number"
                  min="0"
                  name="loyalty_points"
                  value={form.loyalty_points}
                  onChange={(event) =>
                    handleBaseChange({
                      target: {
                        name: "loyalty_points",
                        value: event.target.value === "" ? "0" : event.target.value,
                      },
                    })
                  }
                  placeholder="Nhap diem tich luy"
                />
                {errors.loyalty_points?.[0] && (
                  <div className="popup-error">{errors.loyalty_points[0]}</div>
                )}
              </div>

              <div className="popup-field" style={{ marginBottom: 0 }}>
                <label className="popup-label">Hang hien tai</label>
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--r-md, 12px)",
                    background: "var(--bg-2, #f5f5f7)",
                    color: "var(--text-1, #1c1c1e)",
                    fontWeight: 600,
                  }}
                >
                  {currentRankPreview || "-"}
                </div>
              </div>

              <div className="popup-footer">
                <button type="button" onClick={closeCustomerPopup}>
                  Huy
                </button>
                <button className="btn_success" type="submit" disabled={loading}>
                  {loading
                    ? editingId
                      ? "Dang cap nhat..."
                      : "Dang luu..."
                    : editingId
                      ? "Cap nhat"
                      : "Them moi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {openRankPopup && (
        <div className="card-popup" onClick={closeRankSettingsPopup}>
          <div
            className="popup-md"
            onClick={(event) => event.stopPropagation()}
            style={{ maxWidth: 760 }}
          >
            <div className="popup-header">
              <h3 className="popup-title">Cai dat hang khach hang</h3>
              <button type="button" onClick={closeRankSettingsPopup}>
                Dong
              </button>
            </div>

            <div className="popup-body" style={{ display: "grid", gap: 14 }}>
              <p style={{ margin: 0, color: "var(--text-2, #5c5c62)" }}>
                Moi hang chi can ten va moc diem bat dau. He thong se tu dong
                xep hang cao nhat ma khach dat duoc.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(240px, 1.6fr) minmax(140px, 1fr) 88px",
                  gap: 12,
                  alignItems: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "var(--text-2, #5c5c62)",
                }}
              >
                <div>Ten hang</div>
                <div>Tu diem</div>
                <div />
              </div>

              {rankDrafts.map((rule, index) => (
                <div
                  key={`${index}-${rule.name}-${rule.min_points}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(240px, 1.6fr) minmax(140px, 1fr) 88px",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <input
                    className="popup-input"
                    value={rule.name}
                    onChange={(event) =>
                      handleRankRuleChange(index, "name", event.target.value)
                    }
                    placeholder="Vi du: Vang"
                  />
                  <input
                    className="popup-input"
                    type="number"
                    min="0"
                    value={rule.min_points}
                    onChange={(event) =>
                      handleRankRuleChange(index, "min_points", event.target.value)
                    }
                    placeholder="0"
                  />
                  <button
                    className="btn_delete"
                    type="button"
                    onClick={() => removeRankRule(index)}
                  >
                    Xoa
                  </button>
                </div>
              ))}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <button className="btn_add" type="button" onClick={addRankRule}>
                  Them moc hang
                </button>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button type="button" onClick={closeRankSettingsPopup}>
                    Huy
                  </button>
                  <button
                    className="btn_success"
                    type="button"
                    onClick={handleSaveRankSettings}
                    disabled={rankSaving}
                  >
                    {rankSaving ? "Dang luu..." : "Luu cau hinh"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
