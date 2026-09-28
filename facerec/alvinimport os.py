import os
import base64
import requests
import threading
import time
from queue import Queue

# ======================================
# CONFIG WITH YOUR PATHS
# ======================================

INPUT_FOLDER = r"C:\Users\allisongalon\Downloads\testnew"
OUT_IMAGES = r"C:\Users\allisongalon\Downloads\outputimg"
OUT_TITLES = r"C:\Users\allisongalon\Downloads\titleoutput"

API_ENDPOINT = "https://metrics.monetanalytics.com/FaceReaderPOSTv8/api/facereaderservice/PostImage"

api_key = os.getenv("API_KEY") #os library..


MAX_THREADS = 15
counter = 1


HEADERS = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

os.makedirs(OUT_IMAGES, exist_ok=True)
os.makedirs(OUT_TITLES, exist_ok=True)

# ======================================================
# GLOBALS
# ======================================================
counter_lock = threading.Lock()
print_lock = threading.Lock()
skipped_files = []

# ======================================================
# LOAD ALREADY DONE LIST (RESUME)
# ======================================================
def load_done_files():
    done = set()

    for f in os.listdir(OUT_TITLES):
        if f.endswith(".txt"):
            base = f.replace(".txt", "")
            done.add(base)

    return done


already_done = load_done_files()
if already_done:
    print(f"🔄 Resume mode: {len(already_done)} files already processed.\n")

# ======================================================
# EXTRACT BASIC EMOTIONS
# ======================================================
def extract_basic_emotions(api_json):
    try:
        return api_json["FacialExpressions"]["BasicEmotions"]
    except:
        return None

# ======================================================
# SAFE API REQUEST WITH RETRY
# ======================================================
def safe_post(payload):
    for retry in range(5):
        try:
            res = requests.post(API_ENDPOINT, json=payload, headers=HEADERS, timeout=30)

            if res.status_code == 200:
                return res.json()

            with print_lock:
                print(f"⚠ API error {res.status_code}, retry {retry+1}/5...")

        except Exception as e:
            with print_lock:
                print(f"⚠ Network error: {e}, retry {retry+1}/5...")

        time.sleep(1 + retry)

    return None

# ======================================================
# THREAD WORKER
# ======================================================
def worker(queue):
    global counter, skipped_files

    while True:
        fname = queue.get()
        if fname is None:
            break

        base_name = os.path.splitext(fname)[0]

        # Skip if done
        if base_name in already_done:
            queue.task_done()
            continue

        full_path = os.path.join(INPUT_FOLDER, fname)

        # LOAD IMAGE
        try:
            with open(full_path, "rb") as f:
                img_b64 = base64.b64encode(f.read()).decode()
        except:
            with print_lock:
                print(f"❌ Failed to read file: {fname}")
            skipped_files.append((fname, "read_error"))
            queue.task_done()
            continue

        payload = {
            "sessionInfo": f"user1_{fname}",
            "data": "BASIC",
            "myImage": img_b64
        }

        # API CALL (safe)
        response = safe_post(payload)
        if response is None:
            with print_lock:
                print(f"❌ API FAILED for: {fname}, skipping.")
            skipped_files.append((fname, "api_failed"))
            queue.task_done()
            continue

        emotions = extract_basic_emotions(response)
        if emotions is None:
            with print_lock:
                print(f"⚠ No vector for: {fname}")
            skipped_files.append((fname, "no_vector"))
            queue.task_done()
            continue

        # Save with THREAD SAFE increment
        with counter_lock:
            my_id = counter
            counter += 1

        # Save image
        img_name = f"frame_{my_id:04d}.jpg"
        img_output_path = os.path.join(OUT_IMAGES, img_name)
        with open(img_output_path, "wb") as out_img:
            out_img.write(base64.b64decode(img_b64))

        # Save vector
        txt_name = f"frame_{my_id:04d}.txt"
        txt_output_path = os.path.join(OUT_TITLES, txt_name)
        with open(txt_output_path, "w") as txt:
            for k, v in emotions.items():
                txt.write(f"{k}: {v}\n")

        already_done.add(base_name)

        with print_lock:
            print(f"✔ Saved {img_name} + {txt_name}")

        time.sleep(0.1)  # prevent rate-limit

        queue.task_done()


# ======================================================
# MAIN EXECUTION
# ======================================================
all_files = sorted([f for f in os.listdir(INPUT_FOLDER) if f.lower().endswith((".jpg", ".jpeg", ".png"))])

print(f"\n🔥 STARTING EXTRACTION WITH RESUME SUPPORT ({MAX_THREADS} THREADS)")
print(f"Total images   : {len(all_files)}")
print(f"Already done   : {len(already_done)}")
print(f"Remaining      : {len(all_files) - len(already_done)}\n")

task_queue = Queue()

# Start worker threads
threads = []
for _ in range(MAX_THREADS):
    t = threading.Thread(target=worker, args=(task_queue,), daemon=True)
    t.start()
    threads.append(t)

# Feed only pending files
for fname in all_files:
    if os.path.splitext(fname)[0] not in already_done:
        task_queue.put(fname)

task_queue.join()

# Shutdown threads
for _ in range(MAX_THREADS):
    task_queue.put(None)
for t in threads:
    t.join()

print("\n==============================")
print("        EXTRACTION DONE       ")
print("==============================")
print(f"Processed images: {counter - 1}")
print(f"Skipped images:   {len(skipped_files)}")

if skipped_files:
    print("\n⚠ Skipped file list:")
    for f, reason in skipped_files:
        print(f"- {f} ({reason})")

print("\nOutput saved to:")
print("📁", OUT_IMAGES)
print("📁", OUT_TITLES)
print("==============================\n")