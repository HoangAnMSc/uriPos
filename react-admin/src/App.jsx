import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import PermissionRoute from "./components/PermissionRoute";
import Layout from "./components/Layout";

import Login from "./pages/Auth/Login";
import Dashboard from "./pages/Dashboard";
import Forbidden from "./pages/Forbidden";

import Pos from "./pages/Pos/Pos";
import OrderList from "./pages/Orders/OrderList";
import Customer from "./pages/Customer/Customer";
import ProductList from "./pages/Products/ProductList";
import ContentStructure from "./pages/Content/ContentStructure";
import DiscountCodes from "./pages/DiscountCodes/DiscountCodes";
import PaymentSettings from "./pages/Payment/PaymentSettings";

import UserList from "./pages/User/UserList";
import RoleList from "./pages/Role/RoleList";
import NotificationManage from "./pages/Notification/NotificationManage";
import Chat from "./pages/Chat/Chat";
import Profile from "./pages/Profile/Profile";
import Settings from "./pages/Settings/Settings";
import { ACCESS_RULES, getDocumentTitle } from "./config/adminNavigation";

function TitleManager() {
  const location = useLocation();

  useEffect(() => {
    document.title = getDocumentTitle(location.pathname);
  }, [location.pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <TitleManager />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forbidden" element={<Forbidden />} />

        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route
            path="/pos"
            element={
              <PermissionRoute permissions={ACCESS_RULES.pos}>
                <Pos />
              </PermissionRoute>
            }
          />

          <Route
            path="/customers"
            element={
              <PermissionRoute permissions={ACCESS_RULES.customers}>
                <Customer />
              </PermissionRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <PermissionRoute permissions={ACCESS_RULES.dashboard}>
                <Dashboard />
              </PermissionRoute>
            }
          />

          <Route
            path="/orders"
            element={
              <PermissionRoute permissions={ACCESS_RULES.orders}>
                <OrderList />
              </PermissionRoute>
            }
          />

          <Route
            path="/products"
            element={
              <PermissionRoute permissions={ACCESS_RULES.products}>
                <ProductList />
              </PermissionRoute>
            }
          />

          <Route
            path="/content"
            element={
              <PermissionRoute permissions={ACCESS_RULES.content}>
                <ContentStructure />
              </PermissionRoute>
            }
          />

          <Route
            path="/payment"
            element={
              <PermissionRoute permissions={ACCESS_RULES.payment}>
                <PaymentSettings />
              </PermissionRoute>
            }
          />

          <Route
            path="/discountCodes"
            element={
              <PermissionRoute permissions={ACCESS_RULES.discounts}>
                <DiscountCodes />
              </PermissionRoute>
            }
          />

          <Route
            path="/user-list"
            element={
              <PermissionRoute permissions={ACCESS_RULES.users}>
                <UserList />
              </PermissionRoute>
            }
          />

          <Route
            path="/role-list"
            element={
              <PermissionRoute permissions={ACCESS_RULES.roles}>
                <RoleList />
              </PermissionRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <PermissionRoute permissions={ACCESS_RULES.notifications}>
                <NotificationManage />
              </PermissionRoute>
            }
          />

          <Route
            path="/chat"
            element={
              <PermissionRoute permissions={ACCESS_RULES.chat}>
                <Chat />
              </PermissionRoute>
            }
          />

          <Route path="/profile" element={<Profile />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
