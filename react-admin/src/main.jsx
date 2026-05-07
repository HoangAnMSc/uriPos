import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./App.css";
import "./style/custom/layout.css";
import "./style/custom/form.css";
import "./style/custom/button.css";
import "./style/custom/table.css";
import "./style/custom/popup.css";
import "./style/custom/shortcus.css";
import "./style/custom/settings.css";
import "./style/custom/pages.css";
import { AppSettingsProvider } from "./context/AppSettingsContext";
import { MsgProvider } from "./components/MsgContext/MsgContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppSettingsProvider>
      <MsgProvider>
        <App />
      </MsgProvider>
    </AppSettingsProvider>
  </React.StrictMode>,
);
