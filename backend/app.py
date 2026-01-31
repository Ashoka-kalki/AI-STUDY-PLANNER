from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import requests
import json
import os
from datetime import datetime
import hashlib

app = Flask(__name__)
CORS(app)

DATABASE = "Study.db"
# Get your API key from: https://console.groq.com
GROQ_API_KEY = os.environ.get("GROQ_API_KEY") or "your-groq-api-key-here"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

# ================= DATABASE ================= #
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    db = get_db()

    db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    """)

    db.execute("""
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            difficulty INTEGER NOT NULL,
            deadline INTEGER NOT NULL,
            hours INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    db.commit()

init_db()

# ================= UPDATED GROQ MODELS ================= #
# Latest working models as of 2024
GROQ_MODELS = [
    "llama-3.1-70b-versatile",      # Best overall
    "llama-3.1-8b-instant",         # Fast & efficient
    "mixtral-8x7b-32768",           # Good alternative
    "gemma2-9b-it",                 # Lightweight option
]

def get_groq_ai_tips(subjects):
    """Get AI study tips from Groq API with updated models"""
    
    # Check API key
    if not GROQ_API_KEY or GROQ_API_KEY == "your-groq-api-key-here":
        return "❌ ERROR: Please set your GROQ_API_KEY\n\n1. Get free key: https://console.groq.com\n2. Replace 'your-groq-api-key-here' in app.py\n3. Or set: export GROQ_API_KEY='your-key'"
    
    try:
        # Prepare subject info
        subject_list = "\n".join([
            f"• {s['name']} (Difficulty: {s['difficulty']}/5, Days left: {s['deadline']}, Daily hours: {s['hours']})"
            for s in subjects
        ])
        
        total_hours = sum(s["hours"] for s in subjects)
        urgent_subjects = [s for s in subjects if s["deadline"] <= 3]
        difficult_subjects = [s for s in subjects if s["difficulty"] >= 4]
        
        # Create prompt
        prompt = f"""As an expert study coach, create a personalized study strategy for this student:

SUBJECTS:
{subject_list}

ANALYSIS:
- Total daily hours: {total_hours}
- Urgent subjects (≤3 days): {len(urgent_subjects)}
- Difficult subjects (≥4/5): {len(difficult_subjects)}

Provide SPECIFIC, ACTIONABLE advice including:

1. **Priority Order**: Which subjects to focus on first and why
2. **Study Techniques**: Best methods for each subject type
3. **Time Management**: Daily/weekly schedule recommendations
4. **Efficiency Hacks**: Quick ways to improve retention
5. **Motivation Tips**: How to stay on track

Make it practical, personalized, and easy to implement immediately."""

        # Use the first model (llama-3.1-70b-versatile is usually available)
        model = GROQ_MODELS[0]
        
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "messages": [
                {
                    "role": "system", 
                    "content": "You are an expert educational psychologist and study coach. Provide specific, practical study advice tailored to the student's unique situation."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 1500,
            "top_p": 0.9
        }
        
        print(f"Calling Groq API with model: {model}")
        response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=15)
        
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            tips = result["choices"][0]["message"]["content"]
            return f"🚀 **AI-Powered Study Strategy**\n\n{tips}\n\n_Generated with {model}_"
        
        elif response.status_code == 400:
            # Try alternative models if the first fails
            error_data = response.json()
            if "model" in error_data.get("error", {}).get("message", ""):
                print("Model error, trying alternatives...")
                return try_alternative_models(subjects)
            else:
                return f"❌ API Error 400: {error_data.get('error', {}).get('message', 'Bad request')}"
        
        elif response.status_code == 401:
            return "❌ Invalid API Key\n\nPlease check your GROQ_API_KEY is correct"
        
        elif response.status_code == 429:
            return "⏳ Rate limit exceeded\n\nPlease wait a minute and try again"
        
        else:
            return f"❌ API Error {response.status_code}: {response.text[:200]}"
            
    except requests.exceptions.Timeout:
        return "⏱️ Request timeout\n\nPlease try again in a moment"
    except requests.exceptions.ConnectionError:
        return "🔌 Connection error\n\nCheck your internet connection"
    except Exception as e:
        return f"⚠️ Unexpected error: {str(e)}"

def try_alternative_models(subjects):
    """Try alternative Groq models if the primary one fails"""
    
    # Skip the first model (already tried)
    for model in GROQ_MODELS[1:]:
        try:
            print(f"Trying alternative model: {model}")
            
            subject_list = "\n".join([f"- {s['name']}" for s in subjects])
            prompt = f"Create a study plan for: {subject_list}"
            
            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": model,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 1000
            }
            
            response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                tips = result["choices"][0]["message"]["content"]
                return f"📚 **Study Plan** (via {model})\n\n{tips}"
                
        except Exception as e:
            print(f"Model {model} failed: {e}")
            continue
    
    return "❌ All models failed\n\n1. Check available models at: https://console.groq.com/docs/models\n2. Update GROQ_MODELS list in app.py\n3. Try again later"

# ================= REGISTER ================= #
@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    db = get_db()

    try:
        db.execute(
            "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
            (
                data["username"],
                data["email"].lower(),
                generate_password_hash(data["password"])
            )
        )
        db.commit()
        return jsonify({"message": "Registered successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "User already exists"}), 400

# ================= LOGIN ================= #
@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    db = get_db()

    user = db.execute(
        "SELECT * FROM users WHERE email = ?",
        (data["email"].lower(),)
    ).fetchone()

    if user and check_password_hash(user["password"], data["password"]):
        return jsonify({
            "user": {
                "id": user["id"],
                "username": user["username"],
                "email": user["email"]
            }
        }), 200

    return jsonify({"error": "Invalid credentials"}), 401

# ================= ADD SUBJECT ================= #
@app.route("/api/subject", methods=["POST"])
def add_subject():
    d = request.get_json()
    db = get_db()

    db.execute("""
        INSERT INTO subjects (user_id, name, difficulty, deadline, hours)
        VALUES (?, ?, ?, ?, ?)
    """, (
        d["user_id"],
        d["name"],
        int(d["difficulty"]),
        int(d["deadline"]),
        int(d["hours"])
    ))

    db.commit()
    return jsonify({"message": "Subject added successfully"}), 201

# ================= DELETE SUBJECT ================= #
@app.route("/api/subject/<int:subject_id>", methods=["DELETE"])
def delete_subject(subject_id):
    db = get_db()
    
    db.execute("DELETE FROM subjects WHERE id = ?", (subject_id,))
    db.commit()
    
    return jsonify({"message": "Subject deleted successfully"}), 200

# ================= GET SUBJECTS ================= #
@app.route("/api/subjects/<int:user_id>")
def get_subjects(user_id):
    db = get_db()
    rows = db.execute(
        "SELECT * FROM subjects WHERE user_id = ?",
        (user_id,)
    ).fetchall()

    return jsonify({"subjects": [dict(r) for r in rows]})

# ================= SCHEDULE WITH AI TIPS ================= #
@app.route("/api/schedule/<int:user_id>")
def generate_schedule(user_id):
    """Generate schedule with AI tips"""
    db = get_db()

    # Get subjects
    subjects = db.execute("""
        SELECT name, difficulty, deadline, hours
        FROM subjects
        WHERE user_id = ?
        ORDER BY difficulty DESC, deadline ASC
    """, (user_id,)).fetchall()

    if not subjects:
        return jsonify({
            "schedule": "",
            "tips": "📚 Add subjects to generate AI-powered study plan!",
            "ai_generated": False
        })

    # Generate schedule
    schedule_lines = []
    for i, s in enumerate(subjects):
        priority = "🟥 HIGH" if s["difficulty"] >= 4 else "🟧 MEDIUM" if s["difficulty"] >= 3 else "🟩 LOW"
        urgency = "⚡ URGENT" if s["deadline"] <= 3 else "📅 SOON" if s["deadline"] <= 7 else "⏳ NORMAL"
        
        schedule_lines.append(
            f"{i+1}. {s['name']} | {priority} | {urgency} | {s['hours']} hrs/day"
        )
    
    schedule = "\n".join(schedule_lines)
    
    # Get AI tips
    ai_tips = get_groq_ai_tips(subjects)
    
    # Check if it's an error message
    is_error = any(keyword in ai_tips.lower() for keyword in ["error", "invalid", "failed", "timeout", "limit"])
    
    return jsonify({
        "schedule": schedule,
        "tips": ai_tips,
        "ai_generated": not is_error,
        "has_error": is_error
    })

# ================= TEST ENDPOINTS ================= #
@app.route("/api/test")
def test_api():
    """Test if API is working"""
    return jsonify({
        "status": "online",
        "message": "Study Planner API is running",
        "timestamp": datetime.now().isoformat()
    })

@app.route("/api/test-groq")
def test_groq():
    """Test Groq API connection"""
    if not GROQ_API_KEY or GROQ_API_KEY == "your-groq-api-key-here":
        return jsonify({
            "status": "error",
            "message": "API key not set",
            "fix": "Replace 'your-groq-api-key-here' in app.py with your Groq API key"
        })
    
    try:
        # Test with a simple prompt
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Try each model to see which works
        working_models = []
        
        for model in GROQ_MODELS:
            try:
                payload = {
                    "model": model,
                    "messages": [{"role": "user", "content": "Say 'Hello'"}],
                    "max_tokens": 10
                }
                
                response = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=5)
                
                if response.status_code == 200:
                    working_models.append(model)
                    print(f"✅ Model {model} works")
                else:
                    print(f"❌ Model {model} failed: {response.status_code}")
                    
            except Exception as e:
                print(f"❌ Model {model} error: {e}")
        
        if working_models:
            return jsonify({
                "status": "success",
                "message": f"Groq API is working!",
                "working_models": working_models,
                "recommended_model": working_models[0]
            })
        else:
            return jsonify({
                "status": "error",
                "message": "No models working",
                "available_models": GROQ_MODELS,
                "check_url": "https://console.groq.com/docs/models"
            })
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        })

# ================= LIST AVAILABLE MODELS ================= #
@app.route("/api/models")
def list_models():
    """List available Groq models"""
    return jsonify({
        "available_models": GROQ_MODELS,
        "current_default": GROQ_MODELS[0],
        "note": "Check https://console.groq.com/docs/models for latest"
    })

# ================= RUN APPLICATION ================= #
if __name__ == "__main__":
    print("=" * 60)
    print("🤖 STUDY PLANNER WITH GROQ AI")
    print("=" * 60)
    
    # Check API key
    if GROQ_API_KEY and GROQ_API_KEY != "your-groq-api-key-here":
        print(f"✅ API Key: Configured")
        print(f"   Sample: {GROQ_API_KEY[:10]}...")
    else:
        print("❌ API Key: NOT SET")
        print("\n   To fix this:")
        print("   1. Get FREE API key: https://console.groq.com")
        print("   2. Edit line 16 in app.py:")
        print('      GROQ_API_KEY = "your-actual-key-here"')
        print("   3. Or set environment variable:")
        print("      export GROQ_API_KEY='your-key'")
    
    print(f"\n🤖 Available AI Models:")
    for i, model in enumerate(GROQ_MODELS):
        print(f"   {i+1}. {model}")
    
    print(f"\n📡 Server: http://127.0.0.1:5000")
    print(f"\n🔗 Test endpoints:")
    print(f"   • http://127.0.0.1:5000/api/test          (API status)")
    print(f"   • http://127.0.0.1:5000/api/test-groq     (Groq connection)")
    print(f"   • http://127.0.0.1:5000/api/models        (Available models)")
    print(f"\n📚 Main endpoint:")
    print(f"   • http://127.0.0.1:5000/api/schedule/1    (With user_id=1)")
    print("=" * 60)
    
    # Run the app
    app.run(debug=True, port=5000)