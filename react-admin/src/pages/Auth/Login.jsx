import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { setToken, setPermissions, setRoles } from "../../auth/storage";
import { ButtonContent } from "../../components/Loading/Loading";
import { getApiErrorMessage } from "../../hooks/useApiResource";

const Login = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!agree) {
      setError("Please agree to the terms to continue.");
      return;
    }

    try {
      setLoading(true);
      const res = await axiosClient.post("/login", { email, password });

      setToken(res.data.token);
      setPermissions(res.data.permissions || []);
      setRoles(res.data.roles || []);

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Login failed. Check email and password."));
    } finally {
      setLoading(false);
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

        <button type="submit" disabled={loading}>
          <ButtonContent loading={loading} loadingText="Logging in...">
            Login
          </ButtonContent>
        </button>

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
