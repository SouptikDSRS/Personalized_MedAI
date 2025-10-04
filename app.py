import os
import json
import firebase_admin
from firebase_admin import credentials, firestore
import requests
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS, cross_origin
import traceback
import re
from agent import ask_mistral
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Firebase
firebase_json = os.getenv("FIREBASE_CREDENTIALS_JSON")  # JSON string from Render secret
if not firebase_admin._apps:
    if firebase_json:
        cred_dict = json.loads(firebase_json)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
    else:
        raise Exception("FIREBASE_CREDENTIALS_JSON not found in environment variables.")

db = firestore.client()

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# ----------------- Routes -----------------

@app.route("/")
def home():
    return render_template("chat.html")


@app.route("/sign_up")
def sign_up():
    return render_template("sign_up.html")


@app.route("/chat", methods=["POST"])
def chat_with_ai():
    try:
        data = request.get_json()
        user_message = data.get("message", "").strip()
        if not user_message:
            return jsonify({"error": "Message is empty"}), 400

        ai_response = ask_mistral(user_message)
        return jsonify({"response": ai_response})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/generate_health_plan", methods=["POST"])
def generate_health_plan():
    try:
        data = request.get_json()
        user_id = data.get("userId")
        if not user_id:
            return jsonify({"error": "Missing userId"}), 400

        # Fetch user profile
        user_ref = db.collection("users").document(user_id)
        user_doc = user_ref.get()
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404
        user_data = user_doc.to_dict()

        # Validate height, weight, goal
        try:
            height = float(data.get("height") or user_data.get("height"))
            weight = float(data.get("weight") or user_data.get("weight"))
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid height or weight"}), 400

        goal = data.get("goal") or user_data.get("healthGoals")
        location = data.get("location") or user_data.get("location", "India")

        if not all([height, weight, goal]):
            return jsonify({"error": "Height, weight, and goal are required"}), 400

        # BMI Calculation
        height_m = height / 100
        bmi_value = round(weight / (height_m ** 2), 2)
        if bmi_value < 18.5:
            bmi_category = "Underweight"
        elif bmi_value < 24.9:
            bmi_category = "Normal weight"
        elif bmi_value < 29.9:
            bmi_category = "Overweight"
        else:
            bmi_category = "Obese"
        bmi_explanation = f"Your BMI is {bmi_value} ({bmi_category})."

        # Calories Estimate (Mifflin-St Jeor, age=30, male)
        bmr = (10 * weight) + (6.25 * height) - (5 * 30) + 5
        tdee = round(bmr * 1.55, 2)
        surplus = 350 if goal.lower() == "gain muscle" else -350 if "lose" in goal.lower() else 0
        daily_calories = tdee + surplus
        calorie_summary = (
            f"Your estimated BMR is {bmr:.0f} kcal/day. "
            f"Your TDEE is {tdee:.0f} kcal/day. "
            f"To achieve your goal ({goal}), aim for about {daily_calories:.0f} kcal/day."
        )

        # Generate meal plan & health tip via Gemini API
        prompt = f"""
        You are a health AI assistant.
        User Info:
        - Height: {height} cm
        - Weight: {weight} kg
        - Goal: {goal}
        - Location: {location}

        Generate:
        1. A 1-day meal plan (breakfast, lunch, dinner, snacks) with local foods.
        2. One short health tip.
        Keep it simple, do not include BMI or calorie info.
        """
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        gemini_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        headers = {"Content-Type": "application/json", "X-goog-api-key": gemini_api_key}
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        response = requests.post(gemini_url, headers=headers, json=payload)
        result = response.json()

        if not result.get("candidates"):
            return jsonify({"error": "Gemini returned no candidates", "raw": result}), 500

        ai_output = result["candidates"][0]["content"]["parts"][0]["text"]
        if "Health Tip:" in ai_output:
            meal_plan_text, health_tip_text = map(str.strip, ai_output.split("Health Tip:"))
        else:
            meal_plan_text = ai_output.strip()
            health_tip_text = ""

        # Save to Firestore
        db.collection("users").document(user_id).collection("healthReports").add({
            "bmi": bmi_explanation,
            "calories": calorie_summary,
            "meal_plan": meal_plan_text,
            "health_tip": health_tip_text,
            "timestamp": firestore.SERVER_TIMESTAMP
        })

        return jsonify({
            "bmi_explanation": bmi_explanation,
            "calorie_summary": calorie_summary,
            "meal_plan": meal_plan_text,
            "health_tip": health_tip_text
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/health_followup", methods=["POST"])
def health_followup():
    try:
        data = request.get_json()
        question = data.get("question")
        context = data.get("context", "")
        if not question:
            return jsonify({"error": "No question provided"}), 400

        prompt = f"You are a helpful health assistant. Previous plan:\n{context}\nQuestion: {question}\nRespond informatively."
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        headers = {"Content-Type": "application/json", "X-goog-api-key": gemini_api_key}
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        response = requests.post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
                                 headers=headers, json=payload)
        result = response.json()
        answer = result["candidates"][0]["content"]["parts"][0]["text"]
        return jsonify({"response": answer})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/save_user_data", methods=["POST"])
def save_user_data():
    try:
        data = request.get_json()
        user_id = data.get("userId")
        if not user_id:
            return jsonify({"error": "Missing userId"}), 400

        db.collection("users").document(user_id).set({
            "height": data.get("height"),
            "weight": data.get("weight"),
            "healthGoals": data.get("goal"),
            "location": data.get("region") or "India"
        }, merge=True)
        return jsonify({"success": True})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/get_user_data", methods=["GET"])
def get_user_data():
    try:
        user_id = request.args.get("userId")
        if not user_id:
            return jsonify({"error": "Missing userId"}), 400

        doc = db.collection("users").document(user_id).get()
        if not doc.exists:
            return jsonify({"error": "User not found"}), 404

        user_data = doc.to_dict()
        return jsonify({
            "height": user_data.get("height"),
            "weight": user_data.get("weight"),
            "goal": user_data.get("healthGoals"),
            "region": user_data.get("location")
        })
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/check_medicine", methods=["POST"])
@cross_origin()
def check_medicine():
    try:
        data = request.get_json()
        medicine_name = data.get("medicine", "").strip()
        if not medicine_name:
            return jsonify({"error": "Medicine name required"}), 400

        gemini_api_key = os.getenv("GEMINI_API_KEY")
        prompt = {
            "contents": [{
                "parts": [{
                    "text": (
                        f"Give a structured JSON about the medicine '{medicine_name}' "
                        "with fields: name, description, dosage, sideEffects {common, serious}, interactions [{drug, interaction, severity}], warnings. "
                        "Respond only with valid JSON, no extra text."
                    )
                }]
            }]
        }
        headers = {"Content-Type": "application/json", "X-goog-api-key": gemini_api_key}
        gemini_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        response = requests.post(gemini_url, headers=headers, json=prompt)
        result = response.json()
        raw_text = result["candidates"][0]["content"]["parts"][0]["text"]

        # Parse JSON safely
        cleaned = re.sub(r"```json|```", "", raw_text).strip()
        parsed_json = json.loads(cleaned)

        # Ensure all fields exist
        parsed_json.setdefault("name", medicine_name)
        parsed_json.setdefault("description", "N/A")
        parsed_json.setdefault("dosage", "N/A")
        parsed_json.setdefault("sideEffects", {"common": [], "serious": []})
        parsed_json.setdefault("interactions", [])
        parsed_json.setdefault("warnings", [])

        return jsonify({"result": parsed_json})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "Server error: " + str(e)}), 500


@app.route("/medicine_checker")
def medicine_checker():
    return render_template("medicine_check.html")


# ----------------- Main -----------------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
