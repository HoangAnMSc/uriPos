import React from "react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="nf">
      <div className="nf_box">
        <h1 className="nf_code">404</h1>
        <p className="nf_text">
          Trang không tồn tại hoặc bạn không có quyền truy cập
        </p>

        <div className="nf_actions">
          <button onClick={() => navigate("/")}>Về trang chủ</button>
          <button onClick={() => navigate(-1)}>Quay lại</button>
        </div>
      </div>
    </div>
  );
}
