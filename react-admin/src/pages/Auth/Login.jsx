import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { setToken, setPermissions, setRoles } from "../../auth/storage";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!agree) {
      setError("Please agree to the terms to continue.");
      return;
    }

    try {
      const res = await axiosClient.post("/login", { email, password });

      setToken(res.data.token);
      setPermissions(res.data.permissions || []);
      setRoles(res.data.roles || []);

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError("Login failed. Check email and password.");
    }
  };

  return (
    <div className="login-popup">
      <form onSubmit={submit} className="login-popup-container">
        <div className="login-popup-title">
          <h2>Login</h2>
        </div>

        <div className="login-popup-inputs">
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <div className="login-popup-error">{error}</div>}

        <button type="submit">Login</button>

        <div className="login-popup-condition">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
          />
          <p>By continuing, I agree to the terms of use & privacy policy.</p>
        </div>
      </form>
    </div>
  );
};

export default Login;
