import os

# Folder containing all .txt emotion files
TITLES_FOLDER = r"C:\Users\allisongalon\Downloads\DATA SET FACE\TITLESFINAL"

emotion_counts = {
    "Neutral": 0,
    "Happy": 0,
    "Sad": 0,
    "Angry": 0,
    "Surprised": 0,
    "Scared": 0,
    "Disgusted": 0
    
}

def parse_txt_file(path):
    """
    Reads emotion values from a text file in format:
        Neutral: 0.12345
        Happy: 0.54321
        ...
    Returns dominant emotion name.
    """
    emotions = {}

    with open(path, "r") as f:
        for line in f:
            try:
                key, value = line.strip().split(":")
                emotions[key.strip()] = float(value.strip())
            except:
                pass

    # Skip empty files / bad formats
    if not emotions:
        return None

    # Find emotion with highest score
    dominant = max(emotions, key=emotions.get)
    return dominant


print("\n🔍 Scanning emotion files...\n")

# Loop through all txt files
for file in os.listdir(TITLES_FOLDER):
    if file.lower().endswith(".txt"):
        full_path = os.path.join(TITLES_FOLDER, file)
        dom = parse_txt_file(full_path)

        if dom in emotion_counts:
            emotion_counts[dom] += 1


# Print results
print("===================================")
print("     DOMINANT EMOTION COUNTS")
print("===================================\n")

total = sum(emotion_counts.values())
for emo, count in emotion_counts.items():
    percent = (count / total) * 100 if total else 0
    print(f"{emo:<10} : {count:<6} ({percent:.2f}%)")

print("\n===================================")
print(f"TOTAL FILES READ: {total}")
print("===================================\n")

