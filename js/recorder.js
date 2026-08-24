// =====================================================
// HTML ELEMENTS
// =====================================================

const cameraSelect =
    document.getElementById("cameraSelect");

const microphoneSelect =
    document.getElementById("microphoneSelect");

const preview =
    document.getElementById("preview");

const startButton =
    document.getElementById("startButton");

const stopButton =
    document.getElementById("stopButton");

const status =
    document.getElementById("status");

const downloadLink =
    document.getElementById("downloadLink");


// =====================================================
// RECORDING VARIABLES
// =====================================================

let currentStream = null;

let mediaRecorder = null;

let recordedChunks = [];

let recordingBlob = null;

let recordingURL = null;


// =====================================================
// START
// =====================================================

initialize();


// =====================================================
// INITIALIZE
// =====================================================

async function initialize() {

    try {

        status.textContent =
            "Requesting camera and microphone permission...";


        // Ask for permission

        const permissionStream =
            await navigator.mediaDevices.getUserMedia({

                video: true,

                audio: true

            });


        // Stop temporary permission stream

        permissionStream
            .getTracks()
            .forEach(
                track => track.stop()
            );


        status.textContent =
            "Permission granted. Loading devices...";


        await loadDevices();


        await startCamera();


    }

    catch (error) {

        console.error(
            "Could not access camera/microphone:",
            error
        );


        status.textContent =
            "Could not access the camera or microphone.";

    }

}


// =====================================================
// LOAD DEVICES
// =====================================================

async function loadDevices() {

    const devices =
        await navigator.mediaDevices.enumerateDevices();


    // Clear existing options

    cameraSelect.innerHTML =
        '<option value="">Select camera</option>';

    microphoneSelect.innerHTML =
        '<option value="">Select microphone</option>';


    let cameraNumber = 1;

    let microphoneNumber = 1;


    devices.forEach(
        device => {

            if (
                device.kind ===
                "videoinput"
            ) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    device.deviceId;


                option.textContent =
                    device.label ||
                    `Camera ${cameraNumber}`;


                cameraSelect.appendChild(
                    option
                );


                cameraNumber++;

            }


            if (
                device.kind ===
                "audioinput"
            ) {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    device.deviceId;


                option.textContent =
                    device.label ||
                    `Microphone ${microphoneNumber}`;


                microphoneSelect.appendChild(
                    option
                );


                microphoneNumber++;

            }

        }
    );


    // Automatically select first devices

    const firstCamera =
        cameraSelect.querySelector(
            "option:nth-child(2)"
        );


    const firstMicrophone =
        microphoneSelect.querySelector(
            "option:nth-child(2)"
        );


    if (firstCamera) {

        cameraSelect.value =
            firstCamera.value;

    }


    if (firstMicrophone) {

        microphoneSelect.value =
            firstMicrophone.value;

    }

}


// =====================================================
// START CAMERA
// =====================================================

async function startCamera() {

    try {

        // Stop previous stream

        if (currentStream) {

            currentStream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
                );

        }


        const cameraId =
            cameraSelect.value;

        const microphoneId =
            microphoneSelect.value;


        // Camera constraints

        const videoConstraints =
            cameraId
                ? {
                    deviceId: {
                        exact: cameraId
                    },

                    width: {
                        ideal: 1280
                    },

                    height: {
                        ideal: 720
                    }
                }
                : true;


        // Microphone constraints

        const audioConstraints =
            microphoneId
                ? {
                    deviceId: {
                        exact: microphoneId
                    }
                }
                : true;


        // Get camera + microphone

        currentStream =
            await navigator.mediaDevices
                .getUserMedia({

                    video:
                        videoConstraints,

                    audio:
                        audioConstraints

                });


        // Put camera into video element

        preview.srcObject =
            currentStream;


        // Enable recording

        startButton.disabled =
            false;


        stopButton.disabled =
            true;


        status.textContent =
            "Camera and microphone ready.";

    }

    catch (error) {

        console.error(
            "Camera error:",
            error
        );


        status.textContent =
            "Could not start the selected camera or microphone.";

    }

}


// =====================================================
// CAMERA SELECTION CHANGED
// =====================================================

cameraSelect.addEventListener(
    "change",
    async () => {

        await startCamera();

    }
);


// =====================================================
// MICROPHONE SELECTION CHANGED
// =====================================================

microphoneSelect.addEventListener(
    "change",
    async () => {

        await startCamera();

    }
);


// =====================================================
// START RECORDING
// =====================================================

startButton.addEventListener(
    "click",
    () => {

        if (!currentStream) {

            status.textContent =
                "Camera and microphone are not ready.";

            return;

        }


        recordedChunks = [];


        // =============================================
        // FIND SUPPORTED FORMAT
        // =============================================

        let mimeType =
            "";


        if (
            MediaRecorder.isTypeSupported(
                "video/webm;codecs=vp9,opus"
            )
        ) {

            mimeType =
                "video/webm;codecs=vp9,opus";

        }

        else if (
            MediaRecorder.isTypeSupported(
                "video/webm;codecs=vp8,opus"
            )
        ) {

            mimeType =
                "video/webm;codecs=vp8,opus";

        }

        else if (
            MediaRecorder.isTypeSupported(
                "video/webm"
            )
        ) {

            mimeType =
                "video/webm";

        }


        // =============================================
        // CREATE RECORDER
        // =============================================

        if (mimeType) {

            mediaRecorder =
                new MediaRecorder(
                    currentStream,
                    {
                        mimeType:
                            mimeType
                    }
                );

        }

        else {

            mediaRecorder =
                new MediaRecorder(
                    currentStream
                );

        }


        // =============================================
        // DATA AVAILABLE
        // =============================================

        mediaRecorder.ondataavailable =
            (event) => {

                if (
                    event.data &&
                    event.data.size > 0
                ) {

                    recordedChunks.push(
                        event.data
                    );

                }

            };


        // =============================================
        // RECORDING STOPPED
        // =============================================

        mediaRecorder.onstop =
            () => {

                createRecording();

            };


        // =============================================
        // START
        // =============================================

        mediaRecorder.start(
            1000
        );


        startButton.disabled =
            true;

        stopButton.disabled =
            false;


        status.textContent =
            "🔴 Recording...";

    }
);


// =====================================================
// STOP RECORDING
// =====================================================

stopButton.addEventListener(
    "click",
    () => {

        if (
            !mediaRecorder
        ) {

            return;

        }


        if (
            mediaRecorder.state ===
            "recording"
        ) {

            mediaRecorder.stop();

        }


        startButton.disabled =
            false;

        stopButton.disabled =
            true;


        status.textContent =
            "Processing recording...";

    }
);


// =====================================================
// CREATE RECORDING
// =====================================================

function createRecording() {

    if (
        recordedChunks.length === 0
    ) {

        status.textContent =
            "No recording data was captured.";

        return;

    }


    // =============================================
    // CREATE BLOB
    // =============================================

    recordingBlob =
        new Blob(
            recordedChunks,
            {
                type:
                    mediaRecorder.mimeType ||
                    "video/webm"
            }
        );


    // =============================================
    // CREATE DOWNLOAD URL
    // =============================================

    if (recordingURL) {

        URL.revokeObjectURL(
            recordingURL
        );

    }


    recordingURL =
        URL.createObjectURL(
            recordingBlob
        );


    // =============================================
    // DOWNLOAD LINK
    // =============================================

    downloadLink.href =
        recordingURL;


    downloadLink.download =
        "resume-recording.webm";


    downloadLink.style.display =
        "inline-block";


    // =============================================
    // STATUS
    // =============================================

    const sizeMB =
        (
            recordingBlob.size /
            1024 /
            1024
        ).toFixed(2);


    status.textContent =
        `Recording complete. Size: ${sizeMB} MB`;

}