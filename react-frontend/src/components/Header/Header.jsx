import React from "react";
import "./Header.css";

const Header = () => {
  return (
    <div className="header">
      <div className="header-content">
        <div className="header-badge">🛍️ Mua sắm dễ dàng</div>
        <h1>Khám phá sản phẩm<br /><span>chất lượng cao</span></h1>
        <p>
          Đa dạng sản phẩm, giá cả hợp lý. Đặt hàng nhanh chóng và nhận hàng tận nơi.
        </p>
        <div className="header-actions">
          <a href="#explore-menu" className="header-btn-primary">
            Xem sản phẩm
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          </a>
          <a href="#food-display" className="header-btn-secondary">Xem tất cả</a>
        </div>
      </div>
    </div>
  );
};

export default Header;
