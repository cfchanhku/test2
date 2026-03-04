"""Flask app for displaying and persisting a clickable floor grid."""

import json
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# File used to persist shared marker state across browser sessions.
STATE_FILE = Path(app.root_path) / "data" / "grid_state.json"
# Grid constraints for row/column validation.
COLUMN_COUNT = 7
TOTAL_CELLS = 21

def load_marker_index():
    # Return empty state when no saved state exists yet.
    if not STATE_FILE.exists():
        return {"index": None, "clicked_at": None}

    try:
        with STATE_FILE.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except (json.JSONDecodeError, OSError):
        # Return safe defaults when state file is corrupted or unreadable.
        return {"index": None, "clicked_at": None}

    index = data.get("index")
    clicked_at = data.get("clicked_at")
    if not isinstance(index, int):
        return {"index": None, "clicked_at": None}

    if clicked_at is not None and not isinstance(clicked_at, str):
        clicked_at = None

    # Reject invalid saved index values.
    if index < 0 or index >= TOTAL_CELLS:
        return {"index": None, "clicked_at": None}

    is_first_row = index < COLUMN_COUNT
    is_first_column = index % COLUMN_COUNT == 0
    if is_first_row or is_first_column:
        return {"index": None, "clicked_at": None}

    return {"index": index, "clicked_at": clicked_at}


def save_marker_index(index, clicked_at):
    # Ensure the data folder exists before writing state.
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with STATE_FILE.open("w", encoding="utf-8") as file:
        json.dump({"index": index, "clicked_at": clicked_at}, file)


@app.route("/")
def index():
    return render_template("index.html")


@app.get("/api/marker")
def get_marker():
    return jsonify(load_marker_index())


@app.post("/api/marker")
def set_marker():
    payload = request.get_json(silent=True) or {}
    index = payload.get("index")

    if not isinstance(index, int):
        return jsonify({"error": "index must be an integer"}), 400

    if index < 0 or index >= TOTAL_CELLS:
        return jsonify({"error": "index out of range"}), 400

    is_first_row = index < COLUMN_COUNT
    is_first_column = index % COLUMN_COUNT == 0
    if is_first_row or is_first_column:
        return jsonify({"error": "first row/column cannot be selected"}), 400

    # Store in readable text format for UI display.
    clicked_at = datetime.now().strftime("%-d %b %Y %H:%M:%S")
    save_marker_index(index, clicked_at)
    return jsonify({"ok": True, "index": index, "clicked_at": clicked_at})


if __name__ == "__main__":
    app.run(debug=True)