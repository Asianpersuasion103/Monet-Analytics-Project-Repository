# =========================================================
# IMPORTS
# =========================================================

from flask import Flask, render_template, send_from_directory, request
import imageio_ffmpeg
import subprocess
import os


# =========================================================
# FLASK SETUP
# =========================================================

app = Flask(__name__, template_folder=".")


# =========================================================
# FILE LOCATIONS
# =========================================================

RECORDINGS_FOLDER = "recordings"

TEMP_VIDEO = os.path.join(
    RECORDINGS_FOLDER,
    "recording.webm"
)

FINAL_VIDEO = os.path.join(
    RECORDINGS_FOLDER,
    "final_output.mp4"
)


# =========================================================
# HOME PAGE
# =========================================================

@app.route("/")
def index():

    return render_template(
        "index.html"
    )


# =========================================================
# RECEIVE RECORDING
# =========================================================

@app.route(
    "/upload",
    methods=["POST"]
)
def upload():

    # Make sure the browser sent a video.

    if "video" not in request.files:

        return (
            "No video received.",
            400
        )


    video = request.files["video"]


    # Make the recordings folder
    # if it does not already exist.

    os.makedirs(
        RECORDINGS_FOLDER,
        exist_ok=True
    )


    # Save the browser recording.

    video.save(
        TEMP_VIDEO
    )


    print()
    print(
        "Browser recording saved:",
        TEMP_VIDEO
    )


    # =====================================================
    # FIND FFMPEG
    # =====================================================

    ffmpeg_path = (
        imageio_ffmpeg.get_ffmpeg_exe()
    )


    print(
        "Using FFmpeg:",
        ffmpeg_path
    )


    # =====================================================
    # CONVERT WEBM → MP4
    # =====================================================

    try:

        subprocess.run(
            [
                ffmpeg_path,

                # Overwrite existing output.
                "-y",

                # Input browser recording.
                "-i",
                TEMP_VIDEO,

                # H.264 video.
                "-c:v",
                "libx264",

                # AAC audio.
                "-c:a",
                "aac",

                # Web-friendly compatibility.
                "-movflags",
                "+faststart",

                # Output.
                FINAL_VIDEO
            ],

            check=True
        )


    except subprocess.CalledProcessError:

        print(
            "FFmpeg conversion failed."
        )

        return (
            "FFmpeg conversion failed.",
            500
        )


    print(
        "Final MP4 saved:",
        FINAL_VIDEO
    )


    return (
        "Recording uploaded and converted successfully."
    )


# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )

