import { useContext } from "react";
import "./ProductDisplay.css";
import { StoreContext } from "../../context/StoreContext";
import ProductItem from "../ProductItem/ProductItem";

const ProductDisplay = ({ category }) => {
  const { product_list, loading } = useContext(StoreContext);

  const filtered = product_list.filter(
    (item) => category === "All" || category === item.category
  );

  return (
    <div className="product-display" id="food-display">
      <div className="product-display-header">
        <h2>{category === "All" ? "Tất cả sản phẩm" : "Sản phẩm"}</h2>
        <span className="product-display-count">{filtered.length} sản phẩm</span>
      </div>

      {loading ? (
        <div className="product-display-skeleton">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-img" />
              <div className="skeleton-body">
                <div className="skeleton-line w70" />
                <div className="skeleton-line w50" />
                <div className="skeleton-line w40" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="product-display-empty">
          <span>🛒</span>
          <p>Không có sản phẩm nào trong danh mục này</p>
        </div>
      ) : (
        <div className="product-display-list">
          {filtered.map((item) => (
            <ProductItem
              key={item._id}
              id={item._id}
              name={item.name}
              description={item.description}
              price={item.price}
              image={item.image}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductDisplay;
