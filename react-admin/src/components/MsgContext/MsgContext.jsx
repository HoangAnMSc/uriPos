import { createContext, useContext, useRef, useState, useEffect } from "react";
import "./MsgContext.css";

const MsgContext = createContext();

export const MsgProvider = ({ children }) => {
  const [msgs, setMsgs] = useState([]);
  const counterRef = useRef(0);

  useEffect(() => {
    return () => {};
  }, []);

  const addMsg = (text, type, duration = 4000) => {
    const id = ++counterRef.current;
    setMsgs((prev) => [...prev.slice(-3), { id, text, type }]); // max 4 toasts

    setTimeout(() => {
      setMsgs((prev) => prev.filter((m) => m.id !== id));
    }, duration);
  };

  const dismiss = (id) => setMsgs((prev) => prev.filter((m) => m.id !== id));

  const showSuccess = (text, duration) => addMsg(text, "success", duration);
  const showDanger  = (text, duration) => addMsg(text, "danger",  duration);

  return (
    <MsgContext.Provider value={{ showSuccess, showDanger }}>
      {children}

      {/* Toast stack — top-right, compact */}
      {msgs.length > 0 && (
        <div className="toast-stack" aria-live="polite">
          {msgs.map((m) => (
            <div
              key={m.id}
              className={`toast-item toast-item--${m.type}`}
              onClick={() => dismiss(m.id)}
              role="alert"
            >
              <span className="toast-icon">
                {m.type === "success" ? "✓" : "⚠"}
              </span>
              <span className="toast-text">{m.text}</span>
              <button
                className="toast-close"
                onClick={(e) => { e.stopPropagation(); dismiss(m.id); }}
                aria-label="Đóng"
              >×</button>
            </div>
          ))}
        </div>
      )}
    </MsgContext.Provider>
  );
};

export const useMsg = () => useContext(MsgContext);
