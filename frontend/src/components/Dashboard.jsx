import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { addSubject, getSubjects, deleteSubject, getSchedule } from "../Api";
import { Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Dashboard() {
  const navigate = useNavigate();

  /* ---------------- STATE ---------------- */
  const [activeView, setActiveView] = useState("add");
  const [subjects, setSubjects] = useState([]);
  const [schedule, setSchedule] = useState("");
  const [tips, setTips] = useState("");
  const [priorityData, setPriorityData] = useState({ labels: [], values: [] });
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [user, setUser] = useState(null);

  /* ---------------- AUTH CHECK ---------------- */
  useEffect(() => {
    const isAuth = localStorage.getItem("isAuthenticated");
    const storedUser = localStorage.getItem("user");

    if (!isAuth || !storedUser) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const parsed = JSON.parse(storedUser);
      if (!parsed?.id) throw new Error("Invalid user");
      setUser(parsed);
    } catch {
      localStorage.clear();
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  /* ---------------- FETCH SUBJECTS ---------------- */
  const fetchSubjects = async (uid) => {
    try {
      const res = await getSubjects(uid);
      const list = res.data?.subjects || res.data || [];
      setSubjects(list);
    } catch (err) {
      console.error("Fetch subjects error:", err);
      setError("Failed to load subjects");
    }
  };

  /* ---------------- FETCH AI ---------------- */
  const fetchAISchedule = async (uid) => {
    setLoading(true);
    try {
      const res = await getSchedule(uid);
      setSchedule(res.data?.schedule || "");
      setTips(res.data?.tips || "");

      if (res.data?.schedule) {
        const lines = res.data.schedule.split("\n").filter(Boolean);
        setPriorityData({
          labels: lines.map((l) => l.split("|")[0]),
          values: lines.map((_, i) => lines.length - i),
        });
      }
    } catch (err) {
      console.error("Fetch schedule error:", err);
      setError("Failed to load AI recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchSubjects(user.id);
      fetchAISchedule(user.id);
    }
  }, [user]);

  /* ---------------- ADD SUBJECT ---------------- */
  const handleAdd = async (e) => {
    e.preventDefault();
    setAdding(true);
    setError("");
    setSuccessMessage("");

    const form = e.target;
    const formData = new FormData(form);

    const name = formData.get("name")?.trim();
    const difficulty = Number(formData.get("difficulty"));
    const deadline = Number(formData.get("deadline"));
    const hours = Number(formData.get("hours"));

    // Validation
    if (!name) {
      setError("Subject name is required");
      setAdding(false);
      return;
    }
    if (difficulty < 1 || difficulty > 5 || isNaN(difficulty)) {
      setError("Difficulty must be between 1 and 5");
      setAdding(false);
      return;
    }
    if (deadline < 1 || isNaN(deadline)) {
      setError("Deadline must be at least 1 day");
      setAdding(false);
      return;
    }
    if (hours < 1 || isNaN(hours)) {
      setError("Hours per day must be at least 1");
      setAdding(false);
      return;
    }

    try {
      await addSubject({
        user_id: user.id,
        name: name,
        difficulty: difficulty,
        deadline: deadline,
        hours: hours,
      });

      // Show success message
      setSuccessMessage(`${name} has been added successfully!`);
      
      // Reset form
      form.reset();
      
      // Switch to view tab
      setActiveView("view");
      
      // Refresh data
      await fetchSubjects(user.id);
      await fetchAISchedule(user.id);
      
    } catch (err) {
      console.error("Add subject error:", err);
      setError("Failed to add subject. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  /* ---------------- DELETE SUBJECT ---------------- */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this subject?")) return;
    
    try {
      const subjectToDelete = subjects.find(s => s.id === id);
      await deleteSubject(id);
      
      // Show success message
      if (subjectToDelete) {
        setSuccessMessage(`${subjectToDelete.name} has been deleted successfully!`);
      }
      
      // Refresh data
      await fetchSubjects(user.id);
      await fetchAISchedule(user.id);
      
    } catch (err) {
      console.error("Delete subject error:", err);
      setError("Failed to delete subject. Please try again.");
    }
  };

  /* ---------------- LOGOUT ---------------- */
  const logout = () => {
    localStorage.clear();
    navigate("/login", { replace: true });
  };

  /* ---------------- HELPERS ---------------- */
  const parseScheduleLines = (txt) =>
    txt.split("\n").filter(Boolean).map((t, i) => ({ id: i, text: t }));

  const parseTipsLines = (txt) =>
    txt.split("\n").filter(Boolean).map((t, i) => ({ id: i, text: t }));

  /* ---------------- CHART DATA ---------------- */
  const difficultyData = {
    labels: subjects.map((s) => s.name),
    datasets: [
      {
        label: "Difficulty Level (1-5)",
        data: subjects.map((s) => s.difficulty),
        backgroundColor: subjects.map(s => 
          s.difficulty <= 2 ? "rgba(34, 197, 94, 0.7)" : 
          s.difficulty === 3 ? "rgba(245, 158, 11, 0.7)" : 
          "rgba(239, 68, 68, 0.7)"
        ),
        borderColor: subjects.map(s => 
          s.difficulty <= 2 ? "rgb(34, 197, 94)" : 
          s.difficulty === 3 ? "rgb(245, 158, 11)" : 
          "rgb(239, 68, 68)"
        ),
        borderWidth: 1,
      },
    ],
  };

  const hoursData = {
    labels: subjects.map((s) => s.name),
    datasets: [
      {
        label: "Hours per Day",
        data: subjects.map((s) => s.hours),
        backgroundColor: "rgba(59, 130, 246, 0.7)",
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 1,
      },
    ],
  };

  const pieData = {
    labels: ["Easy (1-2)", "Medium (3)", "Hard (4-5)"],
    datasets: [
      {
        data: [
          subjects.filter((s) => s.difficulty <= 2).length,
          subjects.filter((s) => s.difficulty === 3).length,
          subjects.filter((s) => s.difficulty >= 4).length,
        ],
        backgroundColor: ["#22c55e", "#f59e0b", "#ef4444"],
        borderColor: ["#16a34a", "#d97706", "#dc2626"],
        borderWidth: 2,
      },
    ],
  };

  /* ---------------- CHART OPTIONS ---------------- */
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      }
    }
  };

  if (!user) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100vh",
        background: "#f9fafb"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "50px",
            height: "50px",
            border: "4px solid #e5e7eb",
            borderTop: "4px solid #3b82f6",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 20px"
          }}></div>
          <p style={{ color: "#6b7280" }}>Loading dashboard...</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* SIDEBAR */}
      <aside style={{ 
        width: 260, 
        background: "#111827", 
        color: "#fff", 
        padding: "25px 20px",
        display: "flex",
        flexDirection: "column"
      }}>
        <div style={{ marginBottom: 30 }}>
          <h2 style={{ 
            marginBottom: 5, 
            fontSize: "24px",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <span>📚</span>
           AI-Study-Planner
          </h2>
          <p style={{ 
            fontSize: "12px", 
            color: "#9ca3af",
            marginLeft: "34px"
          }}>AI-Powered Study Assistant</p>
        </div>

        <div style={{ marginBottom: 30 }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "12px",
            padding: "12px",
            background: "rgba(255,255,255,0.1)",
            borderRadius: "10px"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              background: "#3b82f6",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "18px"
            }}>
              {user.name?.charAt(0)?.toUpperCase() || "S"}
            </div>
            <div>
              <p style={{ fontWeight: "bold", fontSize: "16px", margin: 0 }}>
                {user.name || "Student"}
              </p>
              <p style={{ fontSize: "13px", color: "#9ca3af", margin: "2px 0 0 0" }}>
                {user.email || ""}
              </p>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          <button 
            onClick={() => {
              setActiveView("add");
              setError("");
              setSuccessMessage("");
            }}
            style={{
              background: activeView === "add" ? "#3b82f6" : "transparent",
              color: "white",
              border: "none",
              padding: "14px 16px",
              textAlign: "left",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "16px",
              fontWeight: "500",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = activeView === "add" ? "#3b82f6" : "rgba(255,255,255,0.1)"}
            onMouseOut={(e) => e.currentTarget.style.background = activeView === "add" ? "#3b82f6" : "transparent"}
          >
            <span style={{ fontSize: "20px" }}>➕</span>
            Add Subject
          </button>
          
          <button 
            onClick={() => {
              setActiveView("view");
              setError("");
              setSuccessMessage("");
            }}
            style={{
              background: activeView === "view" ? "#3b82f6" : "transparent",
              color: "white",
              border: "none",
              padding: "14px 16px",
              textAlign: "left",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "16px",
              fontWeight: "500",
              transition: "all 0.2s",
              justifyContent: "space-between"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = activeView === "view" ? "#3b82f6" : "rgba(255,255,255,0.1)"}
            onMouseOut={(e) => e.currentTarget.style.background = activeView === "view" ? "#3b82f6" : "transparent"}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "20px" }}>📋</span>
              View Subjects
            </div>
            {subjects.length > 0 && (
              <span style={{
                background: "#10b981",
                color: "white",
                fontSize: "12px",
                padding: "2px 8px",
                borderRadius: "10px",
                fontWeight: "bold"
              }}>
                {subjects.length}
              </span>
            )}
          </button>
          
          <button 
            onClick={() => {
              setActiveView("schedule");
              setError("");
              setSuccessMessage("");
            }}
            style={{
              background: activeView === "schedule" ? "#3b82f6" : "transparent",
              color: "white",
              border: "none",
              padding: "14px 16px",
              textAlign: "left",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "16px",
              fontWeight: "500",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = activeView === "schedule" ? "#3b82f6" : "rgba(255,255,255,0.1)"}
            onMouseOut={(e) => e.currentTarget.style.background = activeView === "schedule" ? "#3b82f6" : "transparent"}
          >
            <span style={{ fontSize: "20px" }}>📅</span>
            Study Schedule & Tips
          </button>
          
          <button 
            onClick={() => {
              setActiveView("analysis");
              setError("");
              setSuccessMessage("");
            }}
            style={{
              background: activeView === "analysis" ? "#3b82f6" : "transparent",
              color: "white",
              border: "none",
              padding: "14px 16px",
              textAlign: "left",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "16px",
              fontWeight: "500",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = activeView === "analysis" ? "#3b82f6" : "rgba(255,255,255,0.1)"}
            onMouseOut={(e) => e.currentTarget.style.background = activeView === "analysis" ? "#3b82f6" : "transparent"}
          >
            <span style={{ fontSize: "20px" }}>📊</span>
            Analysis
          </button>
        </nav>

        <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid #374151" }}>
          <button 
            onClick={logout}
            style={{
              background: "transparent",
              color: "white",
              border: "none",
              padding: "14px 16px",
              textAlign: "left",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontSize: "16px",
              fontWeight: "500",
              width: "100%",
              transition: "all 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)"}
            onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
          >
            <span style={{ fontSize: "20px" }}>🚪</span>
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main style={{ flex: 1, padding: "30px", background: "#f9fafb", overflowY: "auto" }}>
        {/* ALERT MESSAGES */}
        {successMessage && (
          <div style={{
            background: "#d1fae5",
            color: "#065f46",
            padding: "16px 20px",
            borderRadius: "12px",
            marginBottom: "25px",
            border: "1px solid #a7f3d0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "20px" }}>✅</span>
              <span style={{ fontWeight: "500" }}>{successMessage}</span>
            </div>
            <button 
              onClick={() => setSuccessMessage("")}
              style={{
                background: "transparent",
                border: "none",
                color: "#065f46",
                cursor: "pointer",
                fontSize: "22px",
                padding: "0",
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "rgba(6, 95, 70, 0.1)"}
              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div style={{
            background: "#fef2f2",
            color: "#dc2626",
            padding: "16px 20px",
            borderRadius: "12px",
            marginBottom: "25px",
            border: "1px solid #fecaca",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "20px" }}>⚠️</span>
              <span style={{ fontWeight: "500" }}>{error}</span>
            </div>
            <button 
              onClick={() => setError("")}
              style={{
                background: "transparent",
                border: "none",
                color: "#dc2626",
                cursor: "pointer",
                fontSize: "22px",
                padding: "0",
                width: "30px",
                height: "30px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%"
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "rgba(220, 38, 38, 0.1)"}
              onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
            >
              ×
            </button>
          </div>
        )}

        {/* ADD SUBJECT VIEW */}
        {activeView === "add" && (
          <div style={{
            background: "white",
            padding: "35px",
            borderRadius: "16px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            maxWidth: "800px",
            margin: "0 auto"
          }}>
            <div style={{ marginBottom: "30px" }}>
              <h2 style={{ 
                marginBottom: "8px", 
                color: "#111827", 
                fontSize: "28px",
                fontWeight: "700"
              }}>
                Add New Subject
              </h2>
              <p style={{ 
                color: "#6b7280", 
                fontSize: "16px",
                lineHeight: "1.5"
              }}>
                Enter the details of the subject you want to add to your study plan
              </p>
            </div>
            
            <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(2, 1fr)", 
                gap: "25px",
                marginBottom: "10px"
              }}>
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "10px", 
                    fontWeight: "600", 
                    color: "#374151",
                    fontSize: "15px"
                  }}>
                    Subject Name *
                  </label>
                  <input 
                    name="name" 
                    placeholder="e.g., Mathematics, Physics" 
                    required 
                    disabled={adding}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "10px",
                      fontSize: "16px",
                      boxSizing: "border-box",
                      transition: "all 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
                
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "10px", 
                    fontWeight: "600", 
                    color: "#374151",
                    fontSize: "15px"
                  }}>
                    Difficulty Level (1-5) *
                  </label>
                  <input 
                    name="difficulty" 
                    type="number" 
                    min="1" 
                    max="5" 
                    required 
                    placeholder="1 = Easy, 5 = Hard"
                    disabled={adding}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "10px",
                      fontSize: "16px",
                      boxSizing: "border-box",
                      transition: "all 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                  <div style={{ 
                    display: "flex", 
                    gap: "5px", 
                    marginTop: "8px",
                    justifyContent: "center"
                  }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} style={{ 
                        fontSize: "18px", 
                        color: "#d1d5db",
                        cursor: "default"
                      }}>
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "10px", 
                    fontWeight: "600", 
                    color: "#374151",
                    fontSize: "15px"
                  }}>
                    Deadline (days) *
                  </label>
                  <input 
                    name="deadline" 
                    type="number" 
                    min="1" 
                    required 
                    placeholder="Days until deadline"
                    disabled={adding}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "10px",
                      fontSize: "16px",
                      boxSizing: "border-box",
                      transition: "all 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                  <p style={{ 
                    fontSize: "13px", 
                    color: "#6b7280", 
                    marginTop: "8px",
                    marginLeft: "5px"
                  }}>
                    ≤ 3 days = Urgent, ≤ 7 days = Soon
                  </p>
                </div>
                
                <div>
                  <label style={{ 
                    display: "block", 
                    marginBottom: "10px", 
                    fontWeight: "600", 
                    color: "#374151",
                    fontSize: "15px"
                  }}>
                    Hours per Day *
                  </label>
                  <input 
                    name="hours" 
                    type="number" 
                    min="1" 
                    required 
                    placeholder="Daily study hours"
                    disabled={adding}
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "10px",
                      fontSize: "16px",
                      boxSizing: "border-box",
                      transition: "all 0.2s"
                    }}
                    onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                    onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
                  />
                </div>
              </div>
              
              <div style={{ display: "flex", gap: "15px", marginTop: "10px" }}>
                <button 
                  type="submit" 
                  disabled={adding}
                  style={{
                    background: adding ? "#9ca3af" : "#3b82f6",
                    color: "white",
                    border: "none",
                    padding: "16px 32px",
                    borderRadius: "10px",
                    cursor: adding ? "not-allowed" : "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    flex: "1",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => !adding && (e.currentTarget.style.background = "#2563eb")}
                  onMouseOut={(e) => !adding && (e.currentTarget.style.background = "#3b82f6")}
                >
                  {adding ? (
                    <>
                      <span style={{
                        width: "18px",
                        height: "18px",
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTop: "2px solid white",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite"
                      }}></span>
                      Adding Subject...
                    </>
                  ) : (
                    <>
                      <span>➕</span>
                      Add Subject
                    </>
                  )}
                </button>
                
                <button 
                  type="button"
                  onClick={() => {
                    setActiveView("view");
                    setError("");
                    setSuccessMessage("");
                  }}
                  style={{
                    background: "#f3f4f6",
                    color: "#374151",
                    border: "2px solid #e5e7eb",
                    padding: "16px 24px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#e5e7eb"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#f3f4f6"}
                >
                  <span>📋</span>
                  View All Subjects
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW SUBJECTS VIEW */}
        {activeView === "view" && (
          <div style={{
            background: "white",
            padding: "35px",
            borderRadius: "16px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center", 
              marginBottom: "30px",
              flexWrap: "wrap",
              gap: "15px"
            }}>
              <div>
                <h2 style={{ 
                  color: "#111827", 
                  margin: 0, 
                  fontSize: "28px",
                  fontWeight: "700"
                }}>
                  Your Subjects
                </h2>
                <p style={{ 
                  color: "#6b7280", 
                  margin: "8px 0 0 0",
                  fontSize: "16px"
                }}>
                  {subjects.length} subject{subjects.length !== 1 ? 's' : ''} in total
                </p>
              </div>
              
              <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                <button 
                  onClick={() => {
                    setActiveView("add");
                    setError("");
                    setSuccessMessage("");
                  }}
                  style={{
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    padding: "14px 24px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#059669"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#10b981"}
                >
                  <span>➕</span>
                  Add New Subject
                </button>
              </div>
            </div>

            {subjects.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "60px 20px",
                background: "#f8fafc",
                borderRadius: "12px",
                border: "2px dashed #e2e8f0"
              }}>
                <div style={{ 
                  fontSize: "60px", 
                  marginBottom: "20px",
                  opacity: "0.5"
                }}>
                  📚
                </div>
                <h3 style={{ 
                  color: "#4b5563", 
                  marginBottom: "12px",
                  fontSize: "20px",
                  fontWeight: "600"
                }}>
                  No subjects yet
                </h3>
                <p style={{ 
                  color: "#9ca3af", 
                  marginBottom: "30px",
                  fontSize: "16px",
                  maxWidth: "400px",
                  margin: "0 auto 30px"
                }}>
                  Add your first subject to start your personalized study plan
                </p>
                <button 
                  onClick={() => setActiveView("add")}
                  style={{
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    padding: "14px 28px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#2563eb"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#3b82f6"}
                >
                  <span style={{ marginRight: "8px" }}>➕</span>
                  Add First Subject
                </button>
              </div>
            ) : (
              <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ 
                      background: "#f9fafb",
                      borderBottom: "2px solid #e5e7eb"
                    }}>
                      <th style={{ 
                        padding: "18px 16px", 
                        textAlign: "left", 
                        color: "#374151", 
                        fontWeight: "600",
                        fontSize: "15px"
                      }}>
                        Subject
                      </th>
                      <th style={{ 
                        padding: "18px 16px", 
                        textAlign: "left", 
                        color: "#374151", 
                        fontWeight: "600",
                        fontSize: "15px"
                      }}>
                        Difficulty
                      </th>
                      <th style={{ 
                        padding: "18px 16px", 
                        textAlign: "left", 
                        color: "#374151", 
                        fontWeight: "600",
                        fontSize: "15px"
                      }}>
                        Deadline
                      </th>
                      <th style={{ 
                        padding: "18px 16px", 
                        textAlign: "left", 
                        color: "#374151", 
                        fontWeight: "600",
                        fontSize: "15px"
                      }}>
                        Hours/Day
                      </th>
                      <th style={{ 
                        padding: "18px 16px", 
                        textAlign: "left", 
                        color: "#374151", 
                        fontWeight: "600",
                        fontSize: "15px"
                      }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s, index) => (
                      <tr 
                        key={s.id} 
                        style={{ 
                          borderBottom: "1px solid #e5e7eb",
                          background: index % 2 === 0 ? "#fff" : "#f9fafb",
                          transition: "background 0.2s"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "#f0f9ff"}
                        onMouseOut={(e) => e.currentTarget.style.background = index % 2 === 0 ? "#fff" : "#f9fafb"}
                      >
                        <td style={{ padding: "18px 16px", color: "#111827", fontWeight: "500" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ 
                              fontSize: "22px",
                              background: "#f0f9ff",
                              width: "40px",
                              height: "40px",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}>
                              📘
                            </span>
                            <span style={{ fontSize: "16px" }}>{s.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "18px 16px" }}>
                          <div style={{ 
                            background: s.difficulty <= 2 ? "#dcfce7" : 
                                      s.difficulty === 3 ? "#fef3c7" : "#fee2e2",
                            color: s.difficulty <= 2 ? "#166534" : 
                                  s.difficulty === 3 ? "#92400e" : "#991b1b",
                            padding: "8px 16px",
                            borderRadius: "20px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            fontWeight: "600",
                            fontSize: "15px"
                          }}>
                            <div style={{ 
                              display: "flex", 
                              gap: "3px",
                              fontSize: "14px"
                            }}>
                              {[...Array(5)].map((_, i) => (
                                <span 
                                  key={i} 
                                  style={{ 
                                    color: i < s.difficulty ? 
                                      (s.difficulty <= 2 ? "#166534" : 
                                       s.difficulty === 3 ? "#92400e" : "#991b1b") : 
                                      "#d1d5db"
                                  }}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                            {s.difficulty}/5
                          </div>
                        </td>
                        <td style={{ padding: "18px 16px" }}>
                          <div style={{
                            background: s.deadline <= 3 ? "#fee2e2" : 
                                      s.deadline <= 7 ? "#fef3c7" : "#dbeafe",
                            color: s.deadline <= 3 ? "#991b1b" : 
                                  s.deadline <= 7 ? "#92400e" : "#1e40af",
                            padding: "8px 16px",
                            borderRadius: "20px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            fontWeight: "600",
                            fontSize: "15px"
                          }}>
                            <span>📅</span>
                            {s.deadline} day{s.deadline !== 1 ? "s" : ""}
                            {s.deadline <= 3 && (
                              <span style={{ 
                                width: "10px",
                                height: "10px",
                                background: "#ef4444",
                                borderRadius: "50%",
                                animation: "pulse 1.5s infinite"
                              }}></span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: "18px 16px", color: "#111827", fontWeight: "500" }}>
                          <div style={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: "10px",
                            fontSize: "16px"
                          }}>
                            <span style={{ 
                              background: "#f0f9ff",
                              padding: "8px",
                              borderRadius: "10px",
                              fontSize: "18px"
                            }}>⏰</span>
                            {s.hours} hour{s.hours !== 1 ? "s" : ""}
                          </div>
                        </td>
                        <td style={{ padding: "18px 16px" }}>
                          <button 
                            onClick={() => handleDelete(s.id)}
                            style={{
                              background: "#fee2e2",
                              color: "#ef4444",
                              border: "none",
                              padding: "10px 18px",
                              borderRadius: "10px",
                              cursor: "pointer",
                              fontWeight: "600",
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              fontSize: "15px",
                              transition: "all 0.2s"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = "#fecaca"}
                            onMouseOut={(e) => e.currentTarget.style.background = "#fee2e2"}
                          >
                            <span>🗑️</span>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* SCHEDULE & TIPS VIEW */}
        {activeView === "schedule" && (
          <div style={{
            background: "white",
            padding: "35px",
            borderRadius: "16px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
          }}>
            <div style={{ marginBottom: "30px" }}>
              <h2 style={{ 
                marginBottom: "8px", 
                color: "#111827", 
                fontSize: "28px",
                fontWeight: "700"
              }}>
                AI Study Schedule & Tips
              </h2>
              <p style={{ 
                color: "#6b7280", 
                fontSize: "16px"
              }}>
                Personalized study plan and AI recommendations based on your subjects
              </p>
            </div>

            {loading ? (
              <div style={{ 
                textAlign: "center", 
                padding: "80px 20px",
                background: "#f8fafc",
                borderRadius: "12px",
                border: "2px solid #e2e8f0"
              }}>
                <div style={{
                  width: "60px",
                  height: "60px",
                  border: "4px solid #e5e7eb",
                  borderTop: "4px solid #3b82f6",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 25px"
                }}></div>
                <h3 style={{ 
                  color: "#4b5563", 
                  marginBottom: "10px",
                  fontSize: "20px",
                  fontWeight: "600"
                }}>
                  Generating AI Recommendations
                </h3>
                <p style={{ 
                  color: "#9ca3af", 
                  fontSize: "16px"
                }}>
                  AI is creating your personalized study plan and tips...
                </p>
              </div>
            ) : schedule || tips ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
                {/* LEFT COLUMN: STUDY SCHEDULE */}
                <div>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "12px",
                    marginBottom: "20px"
                  }}>
                    <span style={{ 
                      fontSize: "28px",
                      background: "#3b82f6",
                      color: "white",
                      width: "50px",
                      height: "50px",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      📅
                    </span>
                    <div>
                      <h3 style={{ 
                        color: "#111827", 
                        margin: 0,
                        fontSize: "22px",
                        fontWeight: "700"
                      }}>
                        Study Schedule
                      </h3>
                      <p style={{ 
                        color: "#6b7280", 
                        margin: "5px 0 0 0",
                        fontSize: "15px"
                      }}>
                        Priority-based study timeline
                      </p>
                    </div>
                  </div>

                  {schedule ? (
                    <div style={{ 
                      background: "#f0f9ff", 
                      padding: "25px", 
                      borderRadius: "14px",
                      border: "1px solid #dbeafe",
                      height: "500px",
                      overflowY: "auto"
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        {parseScheduleLines(schedule).map((item, index) => (
                          <div 
                            key={item.id} 
                            style={{ 
                              background: "white",
                              padding: "20px",
                              borderRadius: "12px",
                              borderLeft: "6px solid #3b82f6",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                              transition: "transform 0.2s"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = "translateX(5px)"}
                            onMouseOut={(e) => e.currentTarget.style.transform = "translateX(0)"}
                          >
                            <div style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              gap: "12px",
                              marginBottom: "10px"
                            }}>
                              <div style={{
                                background: "#3b82f6",
                                color: "white",
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "bold",
                                fontSize: "15px"
                              }}>
                                {index + 1}
                              </div>
                              {item.text.toLowerCase().includes("priority") && (
                                <span style={{
                                  background: "#fef3c7",
                                  color: "#92400e",
                                  padding: "5px 12px",
                                  borderRadius: "20px",
                                  fontSize: "13px",
                                  fontWeight: "600",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "5px"
                                }}>
                                  ⭐ Priority
                                </span>
                              )}
                            </div>
                            <p style={{ 
                              margin: 0, 
                              color: "#374151",
                              fontSize: "16px",
                              lineHeight: "1.6",
                              paddingLeft: "44px"
                            }}>
                              {item.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      background: "#f8fafc", 
                      padding: "40px", 
                      borderRadius: "14px",
                      border: "2px dashed #e2e8f0",
                      textAlign: "center"
                    }}>
                      <div style={{ 
                        fontSize: "48px", 
                        marginBottom: "15px",
                        opacity: "0.5"
                      }}>
                        📅
                      </div>
                      <h4 style={{ 
                        color: "#4b5563", 
                        marginBottom: "8px",
                        fontSize: "18px",
                        fontWeight: "600"
                      }}>
                        No schedule available
                      </h4>
                      <p style={{ 
                        color: "#9ca3af", 
                        fontSize: "14px"
                      }}>
                        Add more subjects to generate a study schedule
                      </p>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: AI TIPS */}
                <div>
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "12px",
                    marginBottom: "20px"
                  }}>
                    <span style={{ 
                      fontSize: "28px",
                      background: "#10b981",
                      color: "white",
                      width: "50px",
                      height: "50px",
                      borderRadius: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}>
                      💡
                    </span>
                    <div>
                      <h3 style={{ 
                        color: "#111827", 
                        margin: 0,
                        fontSize: "22px",
                        fontWeight: "700"
                      }}>
                        AI Study Tips
                      </h3>
                      <p style={{ 
                        color: "#6b7280", 
                        margin: "5px 0 0 0",
                        fontSize: "15px"
                      }}>
                        Personalized recommendations for better learning
                      </p>
                    </div>
                  </div>

                  {tips ? (
                    <div style={{ 
                      background: "#f0fdf4", 
                      padding: "25px", 
                      borderRadius: "14px",
                      border: "1px solid #bbf7d0",
                      height: "500px",
                      overflowY: "auto"
                    }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                        {parseTipsLines(tips).map((tip, index) => (
                          <div 
                            key={tip.id} 
                            style={{ 
                              background: "white",
                              padding: "20px",
                              borderRadius: "12px",
                              borderLeft: "6px solid #10b981",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                              transition: "transform 0.2s"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = "translateX(5px)"}
                            onMouseOut={(e) => e.currentTarget.style.transform = "translateX(0)"}
                          >
                            <div style={{ 
                              display: "flex", 
                              alignItems: "flex-start", 
                              gap: "12px"
                            }}>
                              <div style={{
                                background: "#10b981",
                                color: "white",
                                width: "32px",
                                height: "32px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "bold",
                                fontSize: "18px",
                                flexShrink: 0
                              }}>
                                {index + 1}
                              </div>
                              <div>
                                <p style={{ 
                                  margin: 0, 
                                  color: "#374151",
                                  fontSize: "16px",
                                  lineHeight: "1.6"
                                }}>
                                  {tip.text}
                                </p>
                                {index === 0 && (
                                  <p style={{ 
                                    margin: "10px 0 0 0", 
                                    color: "#6b7280",
                                    fontSize: "14px",
                                    fontStyle: "italic"
                                  }}>
                                    💡 Pro tip: Follow these recommendations for best results
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ 
                      background: "#f8fafc", 
                      padding: "40px", 
                      borderRadius: "14px",
                      border: "2px dashed #e2e8f0",
                      textAlign: "center"
                    }}>
                      <div style={{ 
                        fontSize: "48px", 
                        marginBottom: "15px",
                        opacity: "0.5"
                      }}>
                        💡
                      </div>
                      <h4 style={{ 
                        color: "#4b5563", 
                        marginBottom: "8px",
                        fontSize: "18px",
                        fontWeight: "600"
                      }}>
                        No tips available
                      </h4>
                      <p style={{ 
                        color: "#9ca3af", 
                        fontSize: "14px"
                      }}>
                        Add subjects to get personalized study tips
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ 
                textAlign: "center", 
                padding: "80px 20px",
                background: "#f8fafc",
                borderRadius: "12px",
                border: "2px dashed #e2e8f0"
              }}>
                <div style={{ 
                  fontSize: "60px", 
                  marginBottom: "25px",
                  opacity: "0.5"
                }}>
                  📅💡
                </div>
                <h3 style={{ 
                  color: "#4b5563", 
                  marginBottom: "12px",
                  fontSize: "22px",
                  fontWeight: "600"
                }}>
                  No AI recommendations available
                </h3>
                <p style={{ 
                  color: "#9ca3af", 
                  marginBottom: "30px",
                  fontSize: "16px",
                  maxWidth: "500px",
                  margin: "0 auto 30px"
                }}>
                  Add subjects to generate personalized AI study schedule and tips
                </p>
                <button 
                  onClick={() => setActiveView("add")}
                  style={{
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    padding: "14px 28px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    margin: "0 auto",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#2563eb"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#3b82f6"}
                >
                  <span>➕</span>
                  Add Subjects
                </button>
              </div>
            )}
          </div>
        )}

        {/* ANALYSIS VIEW */}
        {activeView === "analysis" && (
          <div style={{
            background: "white",
            padding: "35px",
            borderRadius: "16px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
          }}>
            <div style={{ marginBottom: "30px" }}>
              <h2 style={{ 
                marginBottom: "8px", 
                color: "#111827", 
                fontSize: "28px",
                fontWeight: "700"
              }}>
                Study Analysis
              </h2>
              <p style={{ 
                color: "#6b7280", 
                fontSize: "16px"
              }}>
                Visual insights and statistics from your study plan
              </p>
            </div>

            {subjects.length > 0 ? (
              <>
                {/* STATS CARDS */}
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(4, 1fr)", 
                  gap: "20px",
                  marginBottom: "40px"
                }}>
                  {[
                    { 
                      label: "Total Subjects", 
                      value: subjects.length, 
                      icon: "📚", 
                      color: "#3b82f6" 
                    },
                    { 
                      label: "Total Hours/Day", 
                      value: subjects.reduce((sum, s) => sum + s.hours, 0), 
                      icon: "⏰", 
                      color: "#10b981" 
                    },
                    { 
                      label: "Avg Difficulty", 
                      value: (subjects.reduce((sum, s) => sum + s.difficulty, 0) / subjects.length).toFixed(1), 
                      icon: "⭐", 
                      color: "#f59e0b" 
                    },
                    { 
                      label: "Urgent (≤3 days)", 
                      value: subjects.filter(s => s.deadline <= 3).length, 
                      icon: "🚨", 
                      color: "#ef4444" 
                    }
                  ].map((stat, index) => (
                    <div 
                      key={index}
                      style={{ 
                        background: "#f8fafc", 
                        padding: "25px",
                        borderRadius: "14px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        transition: "transform 0.2s"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-5px)"}
                      onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
                    >
                      <div style={{ 
                        fontSize: "32px", 
                        marginBottom: "12px",
                        color: stat.color
                      }}>
                        {stat.icon}
                      </div>
                      <p style={{ 
                        fontSize: "36px", 
                        fontWeight: "700", 
                        color: "#111827",
                        margin: "0 0 8px 0"
                      }}>
                        {stat.value}
                      </p>
                      <p style={{ 
                        color: "#6b7280", 
                        fontSize: "15px",
                        margin: 0
                      }}>
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* CHARTS */}
                <div style={{ display: "flex", flexDirection: "column", gap: "40px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
                    <div>
                      <h3 style={{ 
                        color: "#111827", 
                        marginBottom: "20px",
                        fontSize: "20px",
                        fontWeight: "600"
                      }}>
                        Subject Difficulty Levels
                      </h3>
                      <div style={{ height: "350px", background: "#f8fafc", padding: "20px", borderRadius: "12px" }}>
                        <Bar 
                          data={difficultyData} 
                          options={{
                            ...chartOptions,
                            plugins: {
                              ...chartOptions.plugins,
                              tooltip: {
                                callbacks: {
                                  label: (context) => `Difficulty: ${context.parsed.y}/5`
                                }
                              }
                            },
                            scales: {
                              ...chartOptions.scales,
                              y: {
                                ...chartOptions.scales.y,
                                max: 5,
                                ticks: {
                                  stepSize: 1
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <h3 style={{ 
                        color: "#111827", 
                        marginBottom: "20px",
                        fontSize: "20px",
                        fontWeight: "600"
                      }}>
                        Study Hours per Subject
                      </h3>
                      <div style={{ height: "350px", background: "#f8fafc", padding: "20px", borderRadius: "12px" }}>
                        <Bar 
                          data={hoursData} 
                          options={{
                            ...chartOptions,
                            plugins: {
                              ...chartOptions.plugins,
                              tooltip: {
                                callbacks: {
                                  label: (context) => `Hours: ${context.parsed.y} hrs/day`
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "30px" }}>
                    <div>
                      <h3 style={{ 
                        color: "#111827", 
                        marginBottom: "20px",
                        fontSize: "20px",
                        fontWeight: "600"
                      }}>
                        Difficulty Distribution
                      </h3>
                      <div style={{ height: "350px", background: "#f8fafc", padding: "20px", borderRadius: "12px" }}>
                        <Pie 
                          data={pieData} 
                          options={{
                            ...chartOptions,
                            plugins: {
                              ...chartOptions.plugins,
                              tooltip: {
                                callbacks: {
                                  label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: ${value} subjects (${percentage}%)`;
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <h3 style={{ 
                        color: "#111827", 
                        marginBottom: "20px",
                        fontSize: "20px",
                        fontWeight: "600"
                      }}>
                        Deadline Status
                      </h3>
                      <div style={{ 
                        background: "#f8fafc", 
                        padding: "25px", 
                        borderRadius: "12px",
                        height: "350px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        gap: "20px"
                      }}>
                        {[
                          { label: "Urgent (≤3 days)", count: subjects.filter(s => s.deadline <= 3).length, color: "#ef4444" },
                          { label: "Soon (4-7 days)", count: subjects.filter(s => s.deadline > 3 && s.deadline <= 7).length, color: "#f59e0b" },
                          { label: "Normal (>7 days)", count: subjects.filter(s => s.deadline > 7).length, color: "#10b981" }
                        ].map((item, index) => {
                          const percentage = subjects.length > 0 ? Math.round((item.count / subjects.length) * 100) : 0;
                          return (
                            <div key={index}>
                              <div style={{ 
                                display: "flex", 
                                justifyContent: "space-between", 
                                marginBottom: "8px" 
                              }}>
                                <span style={{ color: "#374151", fontWeight: "500" }}>{item.label}</span>
                                <span style={{ color: "#111827", fontWeight: "600" }}>
                                  {item.count} ({percentage}%)
                                </span>
                              </div>
                              <div style={{ 
                                height: "10px", 
                                background: "#e5e7eb", 
                                borderRadius: "5px",
                                overflow: "hidden"
                              }}>
                                <div style={{ 
                                  width: `${percentage}%`, 
                                  height: "100%", 
                                  background: item.color,
                                  borderRadius: "5px"
                                }}></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ 
                textAlign: "center", 
                padding: "80px 20px",
                background: "#f8fafc",
                borderRadius: "12px",
                border: "2px dashed #e2e8f0"
              }}>
                <div style={{ 
                  fontSize: "60px", 
                  marginBottom: "25px",
                  opacity: "0.5"
                }}>
                  📊
                </div>
                <h3 style={{ 
                  color: "#4b5563", 
                  marginBottom: "12px",
                  fontSize: "22px",
                  fontWeight: "600"
                }}>
                  No analysis data available
                </h3>
                <p style={{ 
                  color: "#9ca3af", 
                  marginBottom: "30px",
                  fontSize: "16px",
                  maxWidth: "500px",
                  margin: "0 auto 30px"
                }}>
                  Add subjects to see detailed analysis, charts and statistics
                </p>
                <button 
                  onClick={() => setActiveView("add")}
                  style={{
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    padding: "14px 28px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    margin: "0 auto",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#2563eb"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#3b82f6"}
                >
                  <span>➕</span>
                  Add Subjects
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}