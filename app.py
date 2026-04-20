from flask import Flask, send_from_directory, request, jsonify
import sqlite3
from datetime import datetime, timedelta
import urllib.request
import json as json_lib
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import firebase_admin
from firebase_admin import credentials, messaging, db as firebase_db

# ============================================================
#  FIREBASE CONFIG
# ============================================================
FIREBASE_RTDB_URL = "https://crowd-ai2-default-rtdb.firebaseio.com"

_fb_cred = credentials.Certificate("serviceAccountKey.json")
if not firebase_admin._apps:
    firebase_admin.initialize_app(_fb_cred, {"databaseURL": FIREBASE_RTDB_URL})

def firebase_sync(path, data, method='PUT'):
    """Write data to Firebase Realtime Database."""
    try:
        ref = firebase_db.reference(path)
        if method == 'PATCH':
            ref.update(data)
        else:
            ref.set(data)
    except Exception as e:
        print(f"[Firebase sync error] {e}")

def firebase_send_notification(title, body, event_id=None):
    """Send FCM push notification to all registered tokens via HTTP v1 API."""
    try:
        ref = firebase_db.reference('fcm_tokens')
        tokens_data = ref.get()
        if not tokens_data:
            return
        for uid, info in tokens_data.items():
            token = info.get('token') if isinstance(info, dict) else info
            if not token:
                continue
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data={"event_id": str(event_id) if event_id else ""},
                token=token
            )
            try:
                messaging.send(message)
            except Exception:
                pass
    except Exception as e:
        print(f"[FCM notification error] {e}")

# ============================================================
#  EMAIL CONFIG
# ============================================================
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USER = os.environ.get('EMAIL_USER', 'jowan.mohsen@gmail.com')
EMAIL_PASS = os.environ.get('EMAIL_PASS', 'ttcv avsc tgsg hpnm')


def send_email(to_list, subject, html_body):
    """Send an HTML email to a list of addresses. Silently skips if not configured."""
    if not EMAIL_USER or not EMAIL_PASS:
        print("[Email] Not configured — skipping send.")
        return
    if not to_list:
        return
    try:
        with smtplib.SMTP(EMAIL_HOST, EMAIL_PORT) as server:
            server.ehlo()
            server.starttls()
            server.login(EMAIL_USER, EMAIL_PASS)
            for recipient in to_list:
                msg = MIMEMultipart('alternative')
                msg['Subject'] = subject
                msg['From'] = EMAIL_USER
                msg['To'] = recipient
                msg.attach(MIMEText(html_body, 'html'))
                server.sendmail(EMAIL_USER, recipient, msg.as_string())
        print(f"[Email] Sent '{subject}' to {len(to_list)} recipient(s).")
    except Exception as e:
        print(f"[Email error] {e}")


def get_ticket_holder_emails(event_id, cur):
    """Return list of email addresses for all ticket purchasers of an event."""
    cur.execute("""
        SELECT DISTINCT u.email
        FROM ticket_purchases tp
        JOIN users u ON u.id = tp.user_id
        WHERE tp.event_id = ?
    """, (event_id,))
    return [row["email"] for row in cur.fetchall()]


# ============================================================
#  APP CONFIG
# ============================================================

app = Flask(__name__, static_folder='.', static_url_path='')
DB_NAME = 'crowd.db'


# ============================================================
#  DATABASE CONNECTION
# ============================================================

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn


# ============================================================
#  DATABASE INITIALIZATION
# ============================================================

def init_db():
    conn = get_db_connection()
    cur = conn.cursor()

    # ============================================================
    #  USERS TABLE
    # ============================================================
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL
    )
    """)

    # ============================================================
    #  EVENTS TABLE
    # ============================================================
    cur.execute("""
    CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        organizer_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        location TEXT,
        city TEXT,
        start_date TEXT NOT NULL,
        end_date TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        description TEXT,
        capacity INTEGER NOT NULL,
        ticket_price REAL NOT NULL DEFAULT 0,
        tickets_sold INTEGER NOT NULL DEFAULT 0,
        attendance_count INTEGER NOT NULL DEFAULT 0,
        category TEXT DEFAULT 'event',
        FOREIGN KEY (organizer_id) REFERENCES users(id)
    )
    """)

    # Add missing columns for old databases
    try:
        cur.execute("ALTER TABLE events ADD COLUMN end_date TEXT")
    except sqlite3.OperationalError:
        pass

    try:
        cur.execute("ALTER TABLE events ADD COLUMN organizer_id INTEGER")
    except sqlite3.OperationalError:
        pass

    try:
        cur.execute("ALTER TABLE events ADD COLUMN location TEXT")
    except sqlite3.OperationalError:
        pass

    try:
        cur.execute("ALTER TABLE events ADD COLUMN city TEXT")
    except sqlite3.OperationalError:
        pass

    try:
        cur.execute("ALTER TABLE events ADD COLUMN ticket_price REAL NOT NULL DEFAULT 0")
    except sqlite3.OperationalError:
        pass

    try:
        cur.execute("ALTER TABLE events ADD COLUMN tickets_sold INTEGER NOT NULL DEFAULT 0")
    except sqlite3.OperationalError:
        pass

    # ============================================================
    #  ATTENDANCE TABLE
    # ============================================================
    cur.execute("""
    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER,
        staff_id INTEGER,
        purchase_id INTEGER,
        entry_time TEXT,
        FOREIGN KEY (event_id) REFERENCES events(id),
        FOREIGN KEY (staff_id) REFERENCES users(id),
        FOREIGN KEY (purchase_id) REFERENCES ticket_purchases(id)
    )
    """)

    try:
        cur.execute("ALTER TABLE attendance ADD COLUMN purchase_id INTEGER")
    except sqlite3.OperationalError:
        pass

    # ============================================================
    #  TICKET PURCHASES TABLE
    # ============================================================
    cur.execute("""
    CREATE TABLE IF NOT EXISTS ticket_purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        event_id INTEGER NOT NULL,
        purchase_time TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (event_id) REFERENCES events(id)
    )
    """)

    # ============================================================
    #  NOTIFICATION PREFERENCES TABLE
    # ============================================================
    cur.execute("""
    CREATE TABLE IF NOT EXISTS notification_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        crowd_alerts_enabled INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    """)

    # ============================================================
    #  NOTIFICATIONS TABLE
    # ============================================================
    # This table stores:
    # - ticket purchase alerts
    # - attendance updates
    # - emergency announcements
    # - hourly updates
    cur.execute("""
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        event_id INTEGER,
        type TEXT,
        title TEXT,
        message TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (event_id) REFERENCES events(id)
    )
    """)

    conn.commit()
    conn.close()


# ============================================================
#  HELPERS
# ============================================================

def calculate_crowd_level(attendance_count, capacity):
    if capacity <= 0:
        return "Unknown"

    percentage = (attendance_count / capacity) * 100

    if percentage >= 80:
        return "High"
    elif percentage >= 40:
        return "Medium"
    else:
        return "Low"


def format_ticket_code(purchase_id):
    return "TKT-" + str(purchase_id).zfill(4)


def clamp(value, minimum, maximum):
    return max(minimum, min(value, maximum))


def parse_event_datetime(date_value, time_value):
    if not date_value or not time_value:
        return None

    for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %I:%M %p"):
        try:
            return datetime.strptime(str(date_value) + " " + str(time_value), fmt)
        except ValueError:
            continue

    return None


def build_crowd_prediction(event_row):
    capacity = int(event_row["capacity"] or 0)
    tickets_sold = int(event_row["tickets_sold"] or 0)
    attendance_count = int(event_row["attendance_count"] or 0)
    start_dt = parse_event_datetime(event_row["start_date"], event_row["start_time"])
    end_dt = parse_event_datetime(event_row["end_date"] or event_row["start_date"], event_row["end_time"])
    now = datetime.now()

    if capacity <= 0:
        return {
            "predicted_final_attendance": attendance_count,
            "predicted_peak_attendance": attendance_count,
            "predicted_peak_percent": 0,
            "predicted_crowd_level": "Unknown",
            "forecast_confidence": "Low",
            "forecast_summary": "Not enough capacity data to generate a forecast.",
            "next_hour_expected_entries": 0,
            "hourly_forecast": []
        }

    sell_through = tickets_sold / capacity if capacity else 0
    check_in_rate = (attendance_count / tickets_sold) if tickets_sold > 0 else 0

    is_live = bool(start_dt and end_dt and start_dt <= now <= end_dt)
    is_upcoming = bool(start_dt and now < start_dt)
    is_finished = bool(end_dt and now > end_dt)

    default_show_rate = 0.78
    if sell_through >= 0.9:
        default_show_rate = 0.92
    elif sell_through >= 0.7:
        default_show_rate = 0.86
    elif sell_through >= 0.4:
        default_show_rate = 0.8

    expected_show_rate = max(default_show_rate, check_in_rate if tickets_sold > 0 else 0)
    projected_from_sales = tickets_sold * expected_show_rate

    projected_from_live_pace = attendance_count
    progress_ratio = 0
    if is_live and start_dt and end_dt and end_dt > start_dt:
        elapsed = (now - start_dt).total_seconds()
        duration = (end_dt - start_dt).total_seconds()
        progress_ratio = clamp(elapsed / duration, 0.05, 1)
        projected_from_live_pace = attendance_count / progress_ratio

    if is_finished:
        predicted_final_attendance = attendance_count
    elif is_live:
        blended_projection = (projected_from_sales * 0.55) + (projected_from_live_pace * 0.45)
        predicted_final_attendance = round(max(attendance_count, blended_projection))
    else:
        urgency_bonus = 0
        if start_dt:
            hours_until_start = max((start_dt - now).total_seconds() / 3600, 0)
            if hours_until_start <= 6:
                urgency_bonus = tickets_sold * 0.08
            elif hours_until_start <= 24:
                urgency_bonus = tickets_sold * 0.04
        predicted_final_attendance = round(max(attendance_count, projected_from_sales + urgency_bonus))

    predicted_final_attendance = int(clamp(predicted_final_attendance, attendance_count, capacity))

    rush_factor = 0
    if is_live:
        rush_factor = 0.08 if progress_ratio < 0.35 else 0.12 if progress_ratio < 0.75 else 0.04
    elif is_upcoming:
        rush_factor = 0.1 if sell_through >= 0.7 else 0.05

    predicted_peak_attendance = int(clamp(round(predicted_final_attendance * (1 + rush_factor)), attendance_count, capacity))
    predicted_peak_percent = int(round((predicted_peak_attendance / capacity) * 100)) if capacity else 0
    predicted_crowd_level = calculate_crowd_level(predicted_peak_attendance, capacity)

    confidence_score = 0.35
    if tickets_sold > 0:
        confidence_score += 0.25
    if attendance_count > 0:
        confidence_score += 0.2
    if is_live:
        confidence_score += 0.15
    if start_dt and end_dt:
        confidence_score += 0.05

    confidence_score = clamp(confidence_score, 0, 0.95)
    if confidence_score >= 0.75:
        forecast_confidence = "High"
    elif confidence_score >= 0.5:
        forecast_confidence = "Medium"
    else:
        forecast_confidence = "Low"

    next_hour_expected_entries = 0
    if is_live and end_dt and start_dt and end_dt > now:
        hours_left = max((end_dt - now).total_seconds() / 3600, 1)
        remaining_attendance = max(predicted_final_attendance - attendance_count, 0)
        next_hour_expected_entries = int(round(min(remaining_attendance, remaining_attendance / hours_left)))
    elif is_upcoming and start_dt:
        hours_until_start = max((start_dt - now).total_seconds() / 3600, 1)
        next_hour_expected_entries = int(round(max(predicted_final_attendance - attendance_count, 0) / max(hours_until_start, 6)))

    forecast_summary = (
        "Expected peak crowd is " + str(predicted_peak_percent) + "% of capacity, with about " +
        str(predicted_final_attendance) + " attendees likely to arrive overall."
    )

    hourly_forecast = []
    forecast_base = attendance_count
    future_total = max(predicted_final_attendance, attendance_count)
    for step in range(1, 7):
        point_time = now + timedelta(hours=step)
        label = point_time.strftime("%I %p").lstrip("0")

        if is_finished:
            predicted_attendance = attendance_count
        elif is_live:
            progress = clamp(step / 6, 0, 1)
            predicted_attendance = round(forecast_base + ((future_total - forecast_base) * progress))
        elif is_upcoming:
            progress = clamp(step / 6, 0, 1)
            predicted_attendance = round(attendance_count + ((future_total - attendance_count) * progress * 0.75))
        else:
            predicted_attendance = attendance_count

        predicted_attendance = int(clamp(predicted_attendance, attendance_count, capacity))
        hourly_forecast.append({
            "label": label,
            "attendance": predicted_attendance,
            "percent": int(round((predicted_attendance / capacity) * 100)) if capacity else 0
        })

    return {
        "predicted_final_attendance": predicted_final_attendance,
        "predicted_peak_attendance": predicted_peak_attendance,
        "predicted_peak_percent": predicted_peak_percent,
        "predicted_crowd_level": predicted_crowd_level,
        "forecast_confidence": forecast_confidence,
        "forecast_summary": forecast_summary,
        "next_hour_expected_entries": next_hour_expected_entries,
        "hourly_forecast": hourly_forecast
    }


def create_notification(user_id, event_id, notif_type, title, message):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO notifications (user_id, event_id, type, title, message, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
    """, (user_id, event_id, notif_type, title, message))

    conn.commit()
    conn.close()


# ============================================================
#  FRONTEND
# ============================================================

@app.route('/')
def home():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)


# ============================================================
#  USERS
# ============================================================

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()

    full_name = data.get('full_name')
    email = data.get('email')
    password = data.get('password')
    role = data.get('role')

    if not full_name or not email or not password or not role:
        return jsonify({"message": "Missing fields"}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO users (full_name, email, password, role)
            VALUES (?, ?, ?, ?)
        """, (full_name, email, password, role))

        user_id = cur.lastrowid

        cur.execute("""
            INSERT OR IGNORE INTO notification_preferences (user_id, crowd_alerts_enabled)
            VALUES (?, 1)
        """, (user_id,))

        conn.commit()
        conn.close()

        return jsonify({"message": "User registered successfully", "user": {"id": user_id, "full_name": full_name, "email": email, "role": role}}), 201

    except sqlite3.IntegrityError:
        return jsonify({"message": "Email already exists"}), 409

    except Exception as e:
        print("SIGNUP ERROR:", e)
        return jsonify({"message": "Server error"}), 500


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()

    email = data.get('email')
    password = data.get('password')
    role = data.get('role')

    if not email or not password or not role:
        return jsonify({"message": "Missing fields"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT * FROM users
        WHERE email = ? AND password = ? AND role = ?
    """, (email, password, role))

    user = cur.fetchone()
    conn.close()

    if user:
        return jsonify({
            "message": "Login successful",
            "user": dict(user)
        })

    return jsonify({"message": "Invalid credentials"}), 401


# ============================================================
#  EVENTS
# ============================================================

@app.route('/api/events', methods=['GET'])
def get_events():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT
                e.*,
                u.full_name AS organizer_name
            FROM events e
            LEFT JOIN users u ON u.id = e.organizer_id
            ORDER BY e.id DESC
        """)
        rows = cur.fetchall()
        conn.close()

        events = []
        for row in rows:
            prediction = build_crowd_prediction(row)
            events.append({
                "id": row["id"],
                "organizer_id": row["organizer_id"],
                "organizer_name": row["organizer_name"],
                "name": row["name"],
                "location": row["location"],
                "city": row["city"],
                "start_date": row["start_date"],
                "end_date": row["end_date"],
                "start_time": row["start_time"],
                "end_time": row["end_time"],
                "description": row["description"],
                "capacity": row["capacity"],
                "ticket_price": row["ticket_price"],
                "tickets_sold": row["tickets_sold"],
                "attendance_count": row["attendance_count"],
                "category": row["category"],
                "crowd_level": calculate_crowd_level(row["attendance_count"], row["capacity"]),
                "prediction": prediction
            })

        return jsonify(events)

    except Exception as e:
        print("GET EVENTS ERROR:", e)
        return jsonify({"message": "Server error loading events"}), 500

@app.route('/api/organizer/events/<int:user_id>', methods=['GET'])
def get_organizer_events(user_id):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT role FROM users WHERE id = ?", (user_id,))
    user = cur.fetchone()

    if not user or user["role"] != "organizer":
        conn.close()
        return jsonify({"message": "Access denied"}), 403

    cur.execute("""
        SELECT
            e.*,
            u.full_name AS organizer_name
        FROM events e
        LEFT JOIN users u ON u.id = e.organizer_id
        WHERE e.organizer_id = ?
        ORDER BY e.id DESC
    """, (user_id,))

    rows = cur.fetchall()
    conn.close()

    events = []
    for row in rows:
        prediction = build_crowd_prediction(row)
        events.append({
            "id": row["id"],
            "organizer_id": row["organizer_id"],
            "organizer_name": row["organizer_name"],
            "name": row["name"],
            "location": row["location"],
            "city": row["city"],
            "start_date": row["start_date"],
            "end_date": row["end_date"],
            "start_time": row["start_time"],
            "end_time": row["end_time"],
            "description": row["description"],
            "capacity": row["capacity"],
            "ticket_price": row["ticket_price"],
            "tickets_sold": row["tickets_sold"],
            "attendance_count": row["attendance_count"],
            "crowd_level": calculate_crowd_level(row["attendance_count"], row["capacity"]),
            "prediction": prediction
        })

    return jsonify(events)


@app.route('/api/events', methods=['POST'])
def create_event():
    data = request.get_json()

    category = data.get('category', 'event')

    organizer_id = data.get('organizer_id')
    name = data.get('name')
    location = data.get('location', '')
    city = data.get('city', '')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    description = data.get('description', '')
    capacity = data.get('capacity')
    ticket_price = data.get('ticket_price', 0)

    if not end_date:
        end_date = start_date

    if not organizer_id or not name or not location or not city or not start_date or not start_time or not end_time or capacity is None:
        return jsonify({"message": "Missing fields"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO events (
            organizer_id, name, location, city, start_date, end_date,
            start_time, end_time, description, capacity, ticket_price, category
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """,
     
      (
        organizer_id,
        name,
        location,
        city,
        start_date,
        end_date,
        start_time,
        end_time,
        description,
        int(capacity),
        float(ticket_price),
        category
    ))

    event_id = cur.lastrowid
    conn.commit()
    conn.close()

    firebase_sync(f'events/{event_id}', {
        'id': event_id, 'name': name, 'category': category,
        'location': location, 'city': city,
        'start_date': start_date, 'start_time': start_time,
        'capacity': int(capacity), 'attendance_count': 0, 'crowd_level': 'low'
    })
    firebase_send_notification('New Event', f'"{name}" has been added!', event_id)

    return jsonify({"message": "Event created"}), 201


@app.route('/api/events/<int:event_id>', methods=['PUT'])
def update_event(event_id):
    data = request.get_json()

    organizer_id = data.get('organizer_id')
    name = data.get('name')
    category = data.get('category', 'event')
    description = data.get('description', '')
    location = data.get('location', '')
    city = data.get('city', '')
    start_date = data.get('start_date')
    end_date = data.get('end_date') or start_date
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    capacity = data.get('capacity')
    ticket_price = data.get('ticket_price', 0)

    if not organizer_id or not name or not location or not city or not start_date or not start_time or not end_time or capacity is None:
        return jsonify({"message": "Missing fields"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM events WHERE id = ?", (event_id,))
    event = cur.fetchone()

    if not event:
        conn.close()
        return jsonify({"message": "Event not found"}), 404

    if event["organizer_id"] != organizer_id:
        conn.close()
        return jsonify({"message": "You can only edit your own events"}), 403

    cur.execute("""
        UPDATE events
        SET
            name = ?,
            category = ?,
            description = ?,
            location = ?,
            city = ?,
            start_date = ?,
            end_date = ?,
            start_time = ?,
            end_time = ?,
            capacity = ?,
            ticket_price = ?
        WHERE id = ?
    """, (
        name,
        category,
        description,
        location,
        city,
        start_date,
        end_date,
        start_time,
        end_time,
        int(capacity),
        float(ticket_price),
        event_id
    ))

    conn.commit()
    conn.close()

    firebase_sync(f'events/{event_id}', {
        'id': event_id, 'name': name, 'category': category,
        'location': location, 'city': city,
        'start_date': start_date, 'start_time': start_time,
        'capacity': int(capacity)
    }, method='PATCH')

    return jsonify({"message": "Event updated"})



# ============================================================
#  SCAN ENTRY
# ============================================================

@app.route('/api/events/<int:event_id>/scan', methods=['POST'])
def scan_entry(event_id):
    data = request.get_json()
    staff_id = data.get('staff_id')
    ticket_code = str(data.get('ticket_code', '')).strip().upper()

    if not staff_id or not ticket_code:
        return jsonify({"message": "Missing scan data"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    # verify staff role
    cur.execute("SELECT role FROM users WHERE id = ?", (staff_id,))
    staff_user = cur.fetchone()

    if not staff_user or staff_user["role"] != "entry_staff":
        conn.close()
        return jsonify({"message": "Only entry staff can scan tickets"}), 403

    # get event
    cur.execute("SELECT * FROM events WHERE id = ?", (event_id,))
    event = cur.fetchone()

    if not event:
        conn.close()
        return jsonify({"message": "Event not found"}), 404

    cur.execute("""
        SELECT tp.*, u.full_name
        FROM ticket_purchases tp
        JOIN users u ON u.id = tp.user_id
        WHERE tp.event_id = ?
        ORDER BY tp.id ASC
    """, (event_id,))
    purchases = cur.fetchall()

    purchase = None
    for row in purchases:
        if format_ticket_code(row["id"]) == ticket_code:
            purchase = row
            break

    if not purchase:
        conn.close()
        return jsonify({"message": "Ticket not found"}), 404

    cur.execute("""
        SELECT id FROM attendance
        WHERE event_id = ? AND purchase_id = ?
    """, (event_id, purchase["id"]))
    existing_scan = cur.fetchone()

    if existing_scan:
        conn.close()
        return jsonify({"message": "Ticket already scanned"}), 409

    # save attendance record
    cur.execute("""
        INSERT INTO attendance (event_id, staff_id, purchase_id, entry_time)
        VALUES (?, ?, ?, datetime('now'))
    """, (event_id, staff_id, purchase["id"]))

    # update attendance count
    new_count = event["attendance_count"] + 1

    cur.execute("""
        UPDATE events
        SET attendance_count = ?
        WHERE id = ?
    """, (new_count, event_id))

    conn.commit()
    crowd = calculate_crowd_level(new_count, event["capacity"])
    conn.close()

    firebase_sync(f'events/{event_id}', {
        'attendance_count': new_count,
        'crowd_level': crowd,
        'capacity': event['capacity']
    }, method='PATCH')

    if crowd == 'High':
        firebase_send_notification(
            '🚨 High Crowd Alert',
            f'Crowd at "{event["name"]}" is now HIGH — {new_count}/{event["capacity"]} people',
            event_id
        )
        # email all ticket holders about high crowd
        conn2 = get_db_connection()
        cur2 = conn2.cursor()
        emails = get_ticket_holder_emails(event_id, cur2)
        conn2.close()
        percent = round((new_count / event['capacity']) * 100)
        send_email(
            to_list=emails,
            subject=f"⚠️ High Crowd Alert — {event['name']}",
            html_body=f"""
            <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;">
              <h2 style="color:#dc2626;margin-top:0;">⚠️ High Crowd Alert</h2>
              <p>The event <strong>{event['name']}</strong> has reached a <strong>HIGH crowd level</strong>.</p>
              <p style="font-size:1.1em;">Current attendance: <strong>{new_count} / {event['capacity']}</strong> ({percent}%)</p>
              <p>Please plan your arrival accordingly to avoid congestion.</p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
              <p style="color:#6b7280;font-size:0.85em;">You received this because you purchased a ticket for this event.</p>
            </div>
            """
        )

    # notify organizer
    create_notification(
        user_id=event["organizer_id"],
        event_id=event_id,
        notif_type='update',
        title='Attendance Updated',
        message='New attendee entered "' + event["name"] + '". Current attendance is ' + str(new_count) + '.'
    )

    return jsonify({
        "message": "Entry recorded",
        "ticket_code": ticket_code,
        "customer_name": purchase["full_name"],
        "attendance_count": new_count,
        "crowd_level": crowd,
        "tickets_sold": event["tickets_sold"],
        "remaining_entries": max(event["capacity"] - new_count, 0)
    })


# ============================================================
#  TICKET PURCHASES
# ============================================================

@app.route('/api/events/<int:event_id>/buy', methods=['POST'])
def buy_ticket(event_id):
    data = request.get_json()
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({"message": "You must log in first to purchase a ticket"}), 401

    conn = get_db_connection()
    cur = conn.cursor()

    # get event
    cur.execute("SELECT * FROM events WHERE id = ?", (event_id,))
    event = cur.fetchone()

    if not event:
        conn.close()
        return jsonify({"message": "Event not found"}), 404

    # sold out check
    if event["tickets_sold"] >= event["capacity"]:
        conn.close()
        return jsonify({"message": "Tickets are sold out"}), 400

    # save purchase
    cur.execute("""
        INSERT INTO ticket_purchases (user_id, event_id, purchase_time)
        VALUES (?, ?, datetime('now'))
    """, (user_id, event_id))

    # update tickets sold
    new_tickets_sold = event["tickets_sold"] + 1

    cur.execute("""
        UPDATE events
        SET tickets_sold = ?
        WHERE id = ?
    """, (new_tickets_sold, event_id))

    # get buyer info
    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    buyer = cur.fetchone()

    conn.commit()
    conn.close()

    # notify customer
    create_notification(
        user_id=user_id,
        event_id=event_id,
        notif_type='ticket',
        title='Ticket Purchased Successfully',
        message='Your ticket for "' + event["name"] + '" has been confirmed.'
    )

    # notify organizer
    create_notification(
        user_id=event["organizer_id"],
        event_id=event_id,
        notif_type='update',
        title='New Ticket Purchased',
        message=(buyer["full_name"] if buyer else 'A customer') + ' purchased a ticket for "' + event["name"] + '".'
    )

    return jsonify({
        "message": "Ticket purchased successfully",
        "tickets_sold": new_tickets_sold
    })


# ============================================================
#  REPORTS
# ============================================================

@app.route('/api/reports/<int:event_id>', methods=['GET'])
def get_event_report(event_id):
    start = request.args.get('start')
    end = request.args.get('end')

    conn = get_db_connection()
    cur = conn.cursor()

    # get event
    cur.execute("SELECT * FROM events WHERE id = ?", (event_id,))
    event = cur.fetchone()

    if not event:
        conn.close()
        return jsonify({"message": "Event not found"}), 404

    # get customer purchases for this event
    cur.execute("""
        SELECT
            tp.id AS purchase_id,
            tp.purchase_time,
            u.full_name,
            u.email
        FROM ticket_purchases tp
        JOIN users u ON tp.user_id = u.id
        WHERE tp.event_id = ?
        ORDER BY tp.id ASC
    """, (event_id,))
    purchase_rows = cur.fetchall()

    # get unique staff who scanned tickets for this event
    cur.execute("""
        SELECT DISTINCT
            u.id,
            u.full_name,
            u.email
        FROM attendance a
        JOIN users u ON a.staff_id = u.id
        WHERE a.event_id = ?
        ORDER BY u.full_name ASC
    """, (event_id,))
    staff_rows = cur.fetchall()

    tickets_sold = event["tickets_sold"]
    attendance_count = event["attendance_count"]
    capacity = event["capacity"]
    ticket_price = event["ticket_price"]

    revenue = tickets_sold * ticket_price
    purchase_rate = round((tickets_sold / capacity) * 100, 2) if capacity > 0 else 0
    attendance_rate = round((attendance_count / tickets_sold) * 100, 2) if tickets_sold > 0 else 0
    capacity_attendance_rate = round((attendance_count / capacity) * 100, 2) if capacity > 0 else 0
    sold_out = tickets_sold >= capacity if capacity > 0 else False
    crowd_level = calculate_crowd_level(attendance_count, capacity)

    purchases = []
    for row in purchase_rows:
        purchases.append({
            "ticket_code": format_ticket_code(row["purchase_id"]),
            "customer_name": row["full_name"],
            "customer_email": row["email"],
            "ticket_price": ticket_price,
            "purchase_time": row["purchase_time"]
        })

    staff = []
    for row in staff_rows:
        staff.append({
            "staff_name": row["full_name"],
            "staff_email": row["email"]
        })

    report = {
        "event_id": event["id"],
        "event_name": event["name"],
        "start_date": event["start_date"],
        "end_date": event["end_date"],
        "filter_start": start,
        "filter_end": end,
        "capacity": capacity,
        "ticket_price": ticket_price,
        "tickets_sold": tickets_sold,
        "attendance_count": attendance_count,
        "revenue": revenue,
        "purchase_rate": purchase_rate,
        "attendance_rate": attendance_rate,
        "capacity_attendance_rate": capacity_attendance_rate,
        "sold_out": sold_out,
        "crowd_level": crowd_level,
        "customers": purchases,
        "staff": staff
    }

    conn.close()
    return jsonify(report)


# ============================================================
#  NOTIFICATIONS
# ============================================================

@app.route('/api/notification-preference', methods=['POST'])
def save_notification_preference():
    data = request.get_json()

    user_id = data.get('user_id')
    enabled = data.get('enabled')

    if user_id is None or enabled is None:
        return jsonify({"message": "Missing fields"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO notification_preferences (user_id, crowd_alerts_enabled)
        VALUES (?, ?)
        ON CONFLICT(user_id) DO UPDATE SET crowd_alerts_enabled = excluded.crowd_alerts_enabled
    """, (user_id, 1 if enabled else 0))

    conn.commit()
    conn.close()

    return jsonify({"message": "Preference saved successfully"})


@app.route('/api/notifications/<int:user_id>', methods=['GET'])
def get_notifications(user_id):
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("""
        SELECT * FROM notifications
        WHERE user_id = ?
        ORDER BY id DESC
    """, (user_id,))

    rows = cur.fetchall()
    conn.close()

    notifications = []

    for row in rows:
        notifications.append({
            "id": row["id"],
            "user_id": row["user_id"],
            "event_id": row["event_id"],
            "type": row["type"],
            "title": row["title"],
            "message": row["message"],
            "is_read": bool(row["is_read"]),
            "created_at": row["created_at"]
        })

    return jsonify(notifications)


# ============================================================
#  EMERGENCY NOTIFICATION ROUTE
# ============================================================

@app.route('/api/events/<int:event_id>/emergency', methods=['POST'])
def send_emergency(event_id):
    data = request.get_json()

    organizer_id = data.get('organizer_id')
    message = data.get('message')

    if not organizer_id or not message:
        return jsonify({"message": "Missing fields"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    # get event
    cur.execute("SELECT * FROM events WHERE id = ?", (event_id,))
    event = cur.fetchone()

    if not event:
        conn.close()
        return jsonify({"message": "Event not found"}), 404

    # make sure the organizer owns this event
    if event["organizer_id"] != organizer_id:
        conn.close()
        return jsonify({"message": "Access denied"}), 403

    # get all customers who bought tickets for this event
    cur.execute("""
        SELECT DISTINCT tp.user_id, u.email
        FROM ticket_purchases tp
        JOIN users u ON u.id = tp.user_id
        WHERE tp.event_id = ?
    """, (event_id,))
    customer_rows = cur.fetchall()

    conn.close()

    # send in-app notification and collect emails
    recipient_emails = []
    for row in customer_rows:
        create_notification(
            user_id=row["user_id"],
            event_id=event_id,
            notif_type='emergency',
            title='Emergency Announcement',
            message=message
        )
        recipient_emails.append(row["email"])

    # send emergency email to all ticket holders
    send_email(
        to_list=recipient_emails,
        subject=f"🚨 Emergency Alert — {event['name']}",
        html_body=f"""
        <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;">
          <h2 style="color:#dc2626;margin-top:0;">🚨 Emergency Alert</h2>
          <p>The organizer of <strong>{event['name']}</strong> has sent an urgent message:</p>
          <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px;border-radius:6px;margin:16px 0;">
            <p style="margin:0;color:#1f2937;">{message}</p>
          </div>
          <p style="color:#6b7280;font-size:0.9em;">Event: {event['name']}<br>Date: {event['start_date']} at {event['start_time']}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
          <p style="color:#6b7280;font-size:0.85em;">You received this because you purchased a ticket for this event.</p>
        </div>
        """
    )

    # notify organizer too
    create_notification(
        user_id=organizer_id,
        event_id=event_id,
        notif_type='emergency',
        title='Emergency Sent',
        message='Emergency announcement was sent to all customers for "' + event["name"] + '".'
    )

    return jsonify({"message": "Emergency notification sent!"})


# ============================================================
#  HOURLY UPDATE ROUTE
# ============================================================

@app.route('/api/events/<int:event_id>/hourly-update', methods=['POST'])
def hourly_update(event_id):
    data = request.get_json()
    organizer_id = data.get('organizer_id')

    if not organizer_id:
        return jsonify({"message": "Missing organizer_id"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT * FROM events WHERE id = ?", (event_id,))
    event = cur.fetchone()

    if not event:
        conn.close()
        return jsonify({"message": "Event not found"}), 404

    if event["organizer_id"] != organizer_id:
        conn.close()
        return jsonify({"message": "Access denied"}), 403

    attendance_count = event["attendance_count"]
    capacity = event["capacity"]
    crowd_level = calculate_crowd_level(attendance_count, capacity)
    percentage = round((attendance_count / capacity) * 100, 2) if capacity > 0 else 0

    update_message = (
        'Current attendance for "' + event["name"] + '" is ' +
        str(attendance_count) + ' out of ' + str(capacity) +
        ' (' + str(percentage) + '%). Crowd level is ' + crowd_level + '.'
    )

    conn.close()

    create_notification(
        user_id=organizer_id,
        event_id=event_id,
        notif_type='update',
        title='Hourly Event Update',
        message=update_message
    )

    return jsonify({"message": "Hourly update sent!"})


# ============================================================
#  RUN APP
# ============================================================

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
