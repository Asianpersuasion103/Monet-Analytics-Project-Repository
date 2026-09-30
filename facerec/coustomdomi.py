import os

# Folder containing all emotion txt files
TITLES_FOLDER = r"C:\Users\allisongalon\Downloads\titleoutput"

# Count dictionaries
original_counts = {e: 0 for e in [
    "Neutral", "Happy", "Sad", "Angry", "Surprised", "Scared", "Disgusted"
]}

corrected_counts = {e: 0 for e in original_counts}


def parse_txt_file(path):
    """Read emotion vector from .txt and return dict {emotion: value}."""
    emotions = {}

    with open(path, "r") as f:
        for line in f:
            try:
                key, value = line.strip().split(":")
                emotions[key.strip()] = float(value.strip())
            except:
                pass

    return emotions if emotions else None


def corrected_dominant(emotions):
    """Apply correction rules when Neutral is dominant."""

    original = max(emotions, key=emotions.get)

    if original != "Neutral":
        return original, original  # both same

    # If original is Neutral, check for close competitor
    neutral_score = emotions["Neutral"]

    # Find second highest emotion
    sorted_items = sorted(emotions.items(), key=lambda x: x[1], reverse=True)

    # sorted_items[0] is Neutral
    second_emotion, second_score = sorted_items[1]

    # Check if within 0.1 range
    if neutral_score - second_score <= 0.50:
        # Correct Neutral → second emotion
        return original, second_emotion

    return original, original


print("\n🔍 Scanning files and applying corrections...\n")

# Loop through files
for file in os.listdir(TITLES_FOLDER):
    if not file.lower().endswith(".txt"):
        continue

    full_path = os.path.join(TITLES_FOLDER, file)
    emotions = parse_txt_file(full_path)

    if emotions is None:
        continue

    orig, corr = corrected_dominant(emotions)

    original_counts[orig] += 1
    corrected_counts[corr] += 1


# ------- Print Results -----------

def print_table(title, counts):
    print("\n===================================")
    print(f"    {title}")
    print("===================================\n")

    total = sum(counts.values())

    for emo, count in counts.items():
        percent = (count / total * 100) if total else 0
        print(f"{emo:<10} : {count:<6} ({percent:.2f}%)")

    print("\nTotal:", total)
    print("===================================\n")


print_table("ORIGINAL DOMINANT COUNTS", original_counts)
print_table("CORRECTED DOMINANT COUNTS", corrected_counts)