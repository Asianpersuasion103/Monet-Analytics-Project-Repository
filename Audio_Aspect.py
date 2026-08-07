# Import the sounddevice library and give it the shorter name "sd".
# sounddevice provides access to microphones and speakers through PortAudio.
import sounddevice as sd

# Here it is used to keep the program running while the microphone captures audio.
import time

# Select which audio input device sounddevice should use.
# 24 is the device index assigned to this particular microphone.
# Device indexes can change between computers or when devices are connected/disconnected.
mic_index = 24


# Query sounddevice for information about the selected microphone.
# The returned object contains properties such as:
# device name, input channels, host API, and default sample rate.
device_info = sd.query_devices(mic_index)

print("Device:", device_info["name"])
print("Host API index:", device_info["hostapi"])
print("Default sample rate:", device_info["default_samplerate"])

# Get the microphone's default sample rate and convert it to an integer.
# The sample rate represents how many audio samples are captured per second.
# For example, 48000 means approximately 48,000 samples are captured each second.
# Using the microphone's default rate helps avoid requesting an unsupported rate.
sample_rate = int(device_info["default_samplerate"])

# This function is automatically called by sounddevice whenever
# a new block (chunk) of microphone audio becomes available.
    # indata: NumPy array containing the actual microphone audio samples
    # frames: Number of audio frames contained in the current block.
    # time_info: Timing information associated with the audio stream.
    # status: Reports problems such as audio buffer overflow/underflow.
def audio_callback(indata, frames, time_info, status):

    # Check whether sounddevice/PortAudio detected a problem
    # while processing the current block of audio.
    if status:
        print("Audio status:", status)

    # Calculate the average absolute amplitude of the samples contained in the current audio block.
    # abs(indata): Converts negative sample values to positive magnitudes.
    # .mean(): Calculates their average.
    # This produces a simple measurement of the current audio level.
    # Louder sounds generally produce larger values.
    volume = abs(indata).mean()

    print(f"Audio level: {volume:.6f}")

# Create and open a continuous microphone input stream.
#
# The "with" statement automatically handles opening and closing the audio stream safely.
with sd.InputStream(

    # Select the microphone identified earlier.
    device=mic_index,

    # Capture audio using the microphone's default sample rate.
    samplerate=sample_rate,

    # Capture one audio channel (mono).
    # Stereo would normally use channels=2.
    channels=1,

    # Store individual audio samples as 32-bit floating-point values.
    #
    # float32 audio is convenient for numerical/audio analysis and works naturally with NumPy.
    dtype="float32",

    # Tell sounddevice which function should receive incoming audio.Every time another audio block becomes available,
    # sounddevice automatically calls audio_callback().
    callback=audio_callback

):
    print("Microphone opened successfully.")
    # The audio callback continues receiving microphone data during this period.
    # Without keeping the program alive, Python would immediately leave the "with" block and close the microphone stream.
    
print("To cease operations, perform Ctrl+C")
try:
    while True:
        time.sleep(0.5)
except KeyboardInterrupt:
    print("Session stopped")    
    
# Once execution leaves the "with" block, InputStream is automatically
# stopped and closed, releasing the microphone.
print("Microphone test finished.")