import { useContext } from "react";
import "./ProductItem.css";
import { StoreContext } from "../../context/StoreContext";

const ProductItem = ({ id, name, price, description, image }) => {
  const { cartItems, addToCart, removeFromCart } = useContext(StoreContext);
  const qty = cartItems[id] || 0;

  return (
    <div className="product-item">
      <div className="product-item-img-container">
        <img
          className="product-item-image"
          src={image}
          alt={name}
          onError={(e) => { e.target.style.display = "none"; }}
        />
        <div className="product-item-overlay">
          {qty === 0 ? (
            <button className="product-item-add-btn" onClick={() => addToCart(id)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Thêm vào giỏ
            </button>
          ) : (
            <div className="product-item-counter">
              <button onClick={() => removeFromCart(id)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
              <span>{qty}</span>
              <button onClick={() => addToCart(id)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>
          )}
        </div>
        {qty > 0 && <span className="product-item-badge">{qty}</span>}
      </div>
      <div className="product-item-info">
        <h3 className="product-item-name">{name}</h3>
        {description && <p className="product-item-desc">{description}</p>}
        <div className="product-item-footer">
          <span className="product-item-price">
            {price.toLocaleString("vi-VN")}₫
          </span>
          {qty === 0 ? (
            <button className="product-item-cart-btn" onClick={() => addToCart(id)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
              </svg>
            </button>
          ) : (
            <div className="product-item-qty-inline">
              <button onClick={() => removeFromCart(id)}>−</button>
              <span>{qty}</span>
              <button onClick={() => addToCart(id)}>+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductItem;
