import { useEffect, useState } from "react";
import axios from "axios";
import "./Schedule.css"; // Custom CSS for styling

export default function Schedule() {
  const [schedule, setSchedule] = useState("");
  const [tips, setTips] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios.get("http://127.0.0.1:5000/api/schedule")
      .then(res => {
        setSchedule(res.data.schedule);
        setTips(res.data.tips);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="schedule-container">
      <h2 className="schedule-title">🧠 AI Study Planner</h2>

      {loading ? (
        <div className="loading">Fetching your personalized schedule...</div>
      ) : (
        <>
          <div className="card">
            <h3>📅 Study Schedule</h3>
            <pre className="schedule-text">{schedule || "No schedule available."}</pre>
          </div>

          <div className="card tips-card">
            <h3>💡 Study Tips</h3>
            <pre className="tips-text">{tips || "No tips available."}</pre>
          </div>
        </>
      )}
    </div>
  );
}
