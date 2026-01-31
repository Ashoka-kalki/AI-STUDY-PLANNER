import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllUsers, deleteUser, updateUser } from "../Api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const admin = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!admin || admin.role !== "admin") {
      navigate("/login", { replace: true });
    } else {
      fetchUsers();
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await getAllUsers();
      setUsers(res.data.users);
    } catch {
      alert("Failed to load users");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    await deleteUser(id);
    fetchUsers();
  };

  const handleEdit = async (user) => {
    const newName = prompt("Edit username", user.username);
    if (!newName) return;
    await updateUser(user.id, { username: newName });
    fetchUsers();
  };

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // 📊 ANALYTICS
  const totalUsers = users.length;
  const admins = users.filter((u) => u.role === "admin").length;
  const normalUsers = totalUsers - admins;

  const chartData = {
    labels: ["Admins", "Users"],
    datasets: [
      {
        label: "User Analytics",
        data: [admins, normalUsers],
      },
    ],
  };

  return (
    <div className="dashboard">
      <h2>Admin Dashboard</h2>

      <button onClick={logout} style={{ float: "right" }}>
        Logout
      </button>

      {/* METRICS */}
      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
        <div className="card">Total Users: {totalUsers}</div>
        <div className="card">Admins: {admins}</div>
        <div className="card">Users: {normalUsers}</div>
      </div>

      {/* 📊 CHART */}
      <div style={{ maxWidth: "500px", marginTop: "30px" }}>
        <Bar data={chartData} />
      </div>

      {/* USER TABLE */}
      <h3 style={{ marginTop: "40px" }}>User Management</h3>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.username}</td>
              <td>{u.role}</td>
              <td>
                <button onClick={() => handleEdit(u)}>Edit</button>
                <button onClick={() => handleDelete(u.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
