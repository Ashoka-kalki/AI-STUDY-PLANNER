import { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import axios from "axios";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const API = "http://127.0.0.1:5000/api";

export default function Dashboard({ user }) {
  const [subjects, setSubjects] = useState([]);
  const [schedule, setSchedule] = useState("");
  const [tips, setTips] = useState("");
  const [priorityData, setPriorityData] = useState({ labels: [], values: [] });
  const [loading, setLoading] = useState(false);

  // Safety check for user
  if (!user || !user.id) return <p style={{ padding: 20 }}>Loading user...</p>;

  // Fetch subjects
  const fetchSubjects = async () => {
    try {
      const res = await axios.get(`${API}/subjects/${user.id}`);
      setSubjects(res.data?.subjects || []);
    } catch (err) {
      console.error("Fetch subjects failed:", err.response?.data || err.message);
      setSubjects([]);
    }
  };

  // Fetch AI schedule & tips
  const fetchAISchedule = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/schedule/${user.id}`);
      const scheduleText = res.data?.schedule || "";
      setSchedule(scheduleText);
      setTips(res.data?.tips || "");

      // Parse priority for chart
      const lines = scheduleText.split("\n").filter(Boolean);
      setPriorityData({
        labels: lines.map((l) => l.split("|")[0].replace("-", "").trim()),
        values: lines.map((_, i) => lines.length - i),
      });
    } catch (err) {
      console.error("Error fetching AI schedule:", err.response?.data || err.message);
      setSchedule("AI schedule unavailable");
      setTips("");
      setPriorityData({ labels: [], values: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
    fetchAISchedule();
  }, [user.id]);

  // Add subject
  const handleAdd = async (e) => {
    e.preventDefault();
    const f = e.target;

    const payload = {
      user_id: user.id,
      name: f.name.value.trim(),
      difficulty: Number(f.difficulty.value),
      deadline: Number(f.deadline.value),
      hours: Number(f.hours.value),
    };

    if (!payload.name) {
      alert("Subject name is required");
      return;
    }

    try {
      await axios.post(`${API}/subject`, payload, {
        headers: { "Content-Type": "application/json" },
      });

      f.reset();
      await fetchSubjects();   // wait for updated subjects
      await fetchAISchedule(); // wait for updated schedule
    } catch (err) {
      console.error("Failed to add subject:", err.response?.data || err.message);
      alert("Failed to add subject. Check backend/API.");
    }
  };

  // Delete subject
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this subject?")) return;
    try {
      await axios.delete(`${API}/subject/${id}`);
      await fetchSubjects();
      await fetchAISchedule();
    } catch (err) {
      console.error("Failed to delete subject:", err.response?.data || err.message);
      alert("Failed to delete subject.");
    }
  };

  const chartData = {
    labels: priorityData.labels,
    datasets: [
      {
        label: "Priority (Higher = Study First)",
        data: priorityData.values,
        backgroundColor: "rgba(75, 192, 192, 0.6)",
      },
    ],
  };

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ color: "#2c3e50" }}>Welcome, {user.username || user.name}</h2>

      {/* Add Subject Form */}
      <form
        onSubmit={handleAdd}
        style={{
          marginBottom: 20,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <input name="name" placeholder="Subject Name" required />
        <input
          name="difficulty"
          type="number"
          min="1"
          max="5"
          placeholder="Difficulty (1-5)"
          required
        />
        <input
          name="deadline"
          type="number"
          min="1"
          placeholder="Deadline (days)"
          required
        />
        <input
          name="hours"
          type="number"
          min="1"
          placeholder="Hours/day"
          required
        />
        <button
          type="submit"
          style={{
            background: "#27ae60",
            color: "#fff",
            border: "none",
            padding: "5px 15px",
            cursor: "pointer",
          }}
        >
          Add Subject
        </button>
      </form>

      {/* Subjects Table */}
      <h3>Subjects</h3>
      {subjects.length === 0 ? (
        <p>No subjects yet. Add some above.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20 }}>
          <thead>
            <tr style={{ background: "#2980b9", color: "#fff" }}>
              <th>Name</th>
              <th>Difficulty</th>
              <th>Deadline</th>
              <th>Hours/Day</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id} style={{ textAlign: "center", borderBottom: "1px solid #ccc" }}>
                <td>{s.name}</td>
                <td>{s.difficulty}</td>
                <td>{s.deadline}</td>
                <td>{s.hours}</td>
                <td>
                  <button
                    onClick={() => handleDelete(s.id)}
                    style={{
                      background: "#e74c3c",
                      color: "#fff",
                      border: "none",
                      cursor: "pointer",
                      padding: "3px 8px",
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* AI Schedule & Tips */}
      <h3>AI Study Schedule & Tips</h3>
      {loading ? (
        <p>Loading AI schedule...</p>
      ) : (
        <>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#f8f8f8",
              padding: 10,
              borderRadius: 5,
            }}
          >
            {schedule || "No schedule available."}
          </pre>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              background: "#ecf0f1",
              padding: 10,
              borderRadius: 5,
              color: "#27ae60",
            }}
          >
            {tips || "No tips available."}
          </pre>

          {/* Priority Chart */}
          {priorityData.labels.length > 0 && (
            <div style={{ maxWidth: 600, marginTop: 20 }}>
              <h4>Subject Priority Chart</h4>
              <Bar data={chartData} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
