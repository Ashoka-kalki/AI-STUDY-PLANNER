import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";

export default function App() {
  const [isAuth, setIsAuth] = useState(null);

  useEffect(() => {
    const auth = localStorage.getItem("isAuthenticated");
    setIsAuth(auth === "true");
  }, []);

  if (isAuth === null) return null; // prevent redirect loop

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          isAuth ? <Dashboard /> : <Navigate to="/login" replace />
        }
      />

      <Route
        path="*"
        element={
          <Navigate to={isAuth ? "/dashboard" : "/login"} replace />
        }
      />
    </Routes>
  );
}
