import React, { useState } from "react";
import "./CustomerAuth.css";
import { assets } from "../../assets/assets";
import axios from "../../api/axios";

const CustomerAuth = ({ setShowAuth }) => {
  const [currState, setCurrState] = useState("Login");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = currState === "Login" ? "/customer/login" : "/customer/register";
      const payload = currState === "Login" 
        ? { phone: formData.phone }
        : { name: formData.name, phone: formData.phone };

      const response = await axios.post(endpoint, payload);

      if (response.data.success) {
        localStorage.setItem("customerToken", response.data.token);
        localStorage.setItem("customerData", JSON.stringify(response.data.customer));
        setShowAuth(false);
        window.location.reload();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-auth-popup">
      <form onSubmit={handleSubmit} className="customer-auth-container">
        <div className="customer-auth-title">
          <h2>{currState}</h2>
          <img onClick={() => setShowAuth(false)} src={assets.cross_icon} alt="" />
        </div>
        <div className="customer-auth-inputs">
          {currState === "Sign Up" && (
            <input
              name="name"
              onChange={handleChange}
              value={formData.name}
              type="text"
              placeholder="Tên của bạn"
              required
            />
          )}
          <input
            name="phone"
            onChange={handleChange}
            value={formData.phone}
            type="tel"
            placeholder="Số điện thoại (10 số)"
            pattern="[0-9]{10}"
            required
          />
        </div>
        {error && <p className="customer-auth-error">{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Đang xử lý..." : currState === "Sign Up" ? "Tạo tài khoản" : "Đăng nhập"}
        </button>
        {currState === "Login" ? (
          <p>
            Chưa có tài khoản? <span onClick={() => setCurrState("Sign Up")}>Đăng ký ngay</span>
          </p>
        ) : (
          <p>
            Đã có tài khoản? <span onClick={() => setCurrState("Login")}>Đăng nhập</span>
          </p>
        )}
      </form>
    </div>
  );
};

export default CustomerAuth;
