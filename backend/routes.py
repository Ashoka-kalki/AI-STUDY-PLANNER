from flask import Blueprint, request, jsonify
from database import get_db
from planner_ai import generate_schedule

routes = Blueprint("routes", __name__)

@routes.route("/subject", methods=["POST"])
def add_subject():
    data = request.json
    db = get_db()
    db.execute(
        "INSERT INTO subjects (name, difficulty, deadline, hours) VALUES (?,?,?,?)",
        (data["name"], data["difficulty"], data["deadline"], data["hours"])
    )
    db.commit()
    return jsonify({"message": "Subject added successfully"})

@routes.route("/schedule", methods=["GET"])
def get_schedule():
    db = get_db()
    cur = db.execute("SELECT name, difficulty, deadline, hours FROM subjects")
    rows = cur.fetchall()

    subjects = []
    for r in rows:
        subjects.append({
            "name": r[0],
            "difficulty": r[1],
            "deadline_days": r[2],
            "hours_per_day": r[3]
        })

    ai_plan = generate_schedule(subjects)
    return jsonify({"ai_schedule": ai_plan})
