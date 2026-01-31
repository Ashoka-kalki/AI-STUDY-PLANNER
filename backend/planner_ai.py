import os
import requests

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

def generate_schedule(subjects):
    if not subjects:
        return {
            "schedule": "No subjects added yet.",
            "tips": "Tips (English):\nAdd subjects\n\nಸಲಹೆಗಳು (Kannada):\nವಿಷಯಗಳನ್ನು ಸೇರಿಸಿ"
        }

    if not GROQ_API_KEY:
        return {
            "schedule": "Error: GROQ_API_KEY not set.",
            "tips": ""
        }

    prompt = "Create a study schedule with priority for these subjects:\n"
    for s in subjects:
        prompt += (
            f"- {s['name']} | "
            f"Difficulty: {s.get('difficulty', 1)} | "
            f"Deadline: {s.get('deadline', 7)} days | "
            f"Hours/day: {s.get('hours', 2)}\n"
        )

    prompt += """
IMPORTANT:
- Give the study schedule in English.
- Give tips in TWO sections only.

Tips (English):
- ...

ಸಲಹೆಗಳು (Kannada):
- ...

Keep Kannada simple.
"""

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "You are a helpful bilingual study planner."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 500,
        "temperature": 0.6
    }

    try:
        response = requests.post(GROQ_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()
        data = response.json()

        text = data["choices"][0]["message"]["content"].strip()

        return {
            "schedule": text,
            "tips": ""  # tips are already inside text
        }

    except Exception as e:
        print("Groq API error:", e)
        return {
            "schedule": "Error generating AI schedule.",
            "tips": ""
        }
