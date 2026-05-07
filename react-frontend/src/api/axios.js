import axios from "axios";
import { API_BASE_URL } from "../config/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("customerToken") || "";
  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }
  return config;
});

export default api;
