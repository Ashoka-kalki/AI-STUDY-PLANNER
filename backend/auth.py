from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token

auth_routes = Blueprint("auth", __name__)

@auth_routes.route("/login", methods=["POST"])
def login():
    data = request.json
    if data["username"] == "student" and data["password"] == "student":
        token = create_access_token(identity="student")
        return jsonify(access_token=token)
    return jsonify({"error": "Invalid credentials"}), 401
