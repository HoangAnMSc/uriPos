import { useContext } from "react";
import "./Cart.css";
import { StoreContext } from "../../context/StoreContext";
import { useNavigate } from "react-router-dom";

const Cart = () => {
  const { cartItems, product_list, addToCart, removeFromCart, clearItemFromCart, getTotalCartAmount } =
    useContext(StoreContext);

  const navigate = useNavigate();

  const cartProducts = product_list.filter((item) => cartItems[item._id] > 0);

  return (
    <div className="cart">
      {cartProducts.length === 0 ? (
        <div className="cart-empty">
          <span>🛒</span>
          <p>Giỏ hàng của bạn đang trống</p>
          <button onClick={() => navigate("/")}>Tiếp tục mua sắm</button>
        </div>
      ) : (
        <>
          <h2 className="cart-title">Giỏ hàng ({cartProducts.length} sản phẩm)</h2>

          <div className="cart-items">
            {cartProducts.map((item) => {
              const qty = cartItems[item._id];
              return (
                <div key={item._id} className="cart-item">
                  <img src={item.image} alt={item.name} className="cart-item-img" />
                  <div className="cart-item-info">
                    <p className="cart-item-name">{item.name}</p>
                    <p className="cart-item-price">{item.price.toLocaleString("vi-VN")}₫</p>
                  </div>
                  <div className="cart-item-qty">
                    <button onClick={() => removeFromCart(item._id)}>−</button>
                    <span>{qty}</span>
                    <button onClick={() => addToCart(item._id)}>+</button>
                  </div>
                  <p className="cart-item-subtotal">
                    {(item.price * qty).toLocaleString("vi-VN")}₫
                  </p>
                  <button
                    className="cart-item-remove"
                    onClick={() => clearItemFromCart(item._id)}
                    title="Xóa sản phẩm"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          <div className="cart-bottom">
            <div className="cart-total">
              <h3>Tổng đơn hàng</h3>
              <div className="cart-total-row">
                <span>Tạm tính</span>
                <span>{getTotalCartAmount().toLocaleString("vi-VN")}₫</span>
              </div>
              <div className="cart-total-row">
                <span>Phí vận chuyển</span>
                <span>20.000₫</span>
              </div>
              <hr />
              <div className="cart-total-row total">
                <span>Tổng cộng</span>
                <span>{(getTotalCartAmount() + 20000).toLocaleString("vi-VN")}₫</span>
              </div>
              <button className="cart-checkout-btn" onClick={() => navigate("/order")}>
                Đặt hàng
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            </div>

            <div className="cart-promocode">
              <p>Mã giảm giá</p>
              <div className="cart-promocode-input">
                <input type="text" placeholder="Nhập mã giảm giá..." />
                <button>Áp dụng</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;
