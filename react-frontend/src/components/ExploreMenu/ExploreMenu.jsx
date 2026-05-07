import React, { useContext } from "react";
import "./ExploreMenu.css";
import { StoreContext } from "../../context/StoreContext";

const ExploreMenu = ({ category, setCategory }) => {
  const { content_structures } = useContext(StoreContext);

  return (
    <div className="explore-menu" id="explore-menu">
      <div className="explore-menu-top">
        <h1>Khám phá danh mục</h1>
        <p>Chọn danh mục để tìm sản phẩm phù hợp với bạn</p>
      </div>

      <div className="explore-menu-list">
        <button
          onClick={() => setCategory("All")}
          className={`explore-menu-chip ${category === "All" ? "active" : ""}`}
        >
          Tất cả
        </button>
        {content_structures.map((item) => (
          <button
            key={item.id}
            onClick={() => setCategory((prev) => prev === item.id ? "All" : item.id)}
            className={`explore-menu-chip ${category === item.id ? "active" : ""}`}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ExploreMenu;
