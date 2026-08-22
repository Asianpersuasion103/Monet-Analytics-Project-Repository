"use strict";


// ==================================================
// URL PARAMETERS
// ==================================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );


const role =
    urlParams.get(
        "role"
    );


const room =
    urlParams.get(
        "room"
    );


// ==================================================
// HTML ELEMENTS
// ==================================================

const localVideo =
    document.getElementById(
        "localVideo"
    );


const remoteVideo =
    document.getElementById(
        "remoteVideo"
    );


const roomDisplay =
    document.getElementById(
        "roomDisplay"
    );


const status =
    document.getElementById(
        "status"
    );


const backButton =
    document.getElementById(
        "backButton"
    );


const startMeetingButton =
    document.getElementById(
        "startMeetingButton"
    );


const startRecordingButton =
    document.getElementById(
        "startRecordingButton"
    );


const stopRecordingButton =
    document.getElementById(
        "stopRecordingButton"
    );


const endMeetingButton =
    document.getElementById(
        "endMeetingButton"
    );


const recordingPreview =
    document.getElementById(
        "recordingPreview"
    );


const downloadRecording =
    document.getElementById(
        "downloadRecording"
    );


// ==================================================
// VALIDATE
// ==================================================

if (
    !role ||
    !room
) {

    if (status) {

        status.textContent =
            "Invalid meeting URL.";

    }


    if (
        startMeetingButton
    ) {

        startMeetingButton.disabled =
            true;

    }

}


// ==================================================
// DISPLAY ROOM
// ==================================================

if (
    roomDisplay &&
    room
) {

    roomDisplay.textContent =
        `Room: ${room}`;

}


// ==================================================
// VARIABLES
// ==================================================

let localStream =
    null;

let remoteStream =
    null;

let peerConnection =
    null;

let socket =
    null;

let peerConnected =
    false;

let meetingStarted =
    false;


// ==================================================
// RECORDING VARIABLES
// ==================================================

let mediaRecorder =
    null;

let recordedChunks =
    [];

let recordingURL =
    null;

let recordingCanvas =
    null;

let recordingCanvasContext =
    null;

let recordingAnimationFrame =
    null;

let recordingAudioContext =
    null;

let recordingAudioDestination =
    null;

let localAudioSource =
    null;

let remoteAudioSource =
    null;


// ==================================================
// SIGNALING SERVER
// ==================================================

const SIGNALING_SERVER =
    `ws://${window.location.hostname}:8080`;


// ==================================================
// ICE
// ==================================================

const ICE_SERVERS = {

    iceServers: [

        {
            urls:
                "stun:stun.l.google.com:19302"
        }

    ]

};


// ==================================================
// INITIALIZE
// ==================================================

initialize();


function initialize() {

    if (
        !role ||
        !room
    ) {

        return;

    }


    console.log(
        "Role:",
        role
    );


    console.log(
        "Room:",
        room
    );


    connectToSignalingServer();

}


// ==================================================
// CONNECT SIGNALING SERVER
// ==================================================

function connectToSignalingServer() {

    status.textContent =
        "Connecting to meeting server...";


    const websocketURL =
        SIGNALING_SERVER +
        "?room=" +
        encodeURIComponent(
            room
        ) +
        "&role=" +
        encodeURIComponent(
            role
        );


    console.log(
        "WebSocket:",
        websocketURL
    );


    socket =
        new WebSocket(
            websocketURL
        );


    socket.onopen =
        function () {

            console.log(
                "Connected to signaling server."
            );


            status.textContent =
                "Connected. Waiting for participant...";

        };


    socket.onmessage =
        async function (
            event
        ) {

            try {

                const message =
                    JSON.parse(
                        event.data
                    );


                console.log(
                    "Signaling:",
                    message.type
                );


                await handleSignalingMessage(
                    message
                );

            }

            catch (error) {

                console.error(
                    "Signaling error:",
                    error
                );

            }

        };


    socket.onclose =
        function () {

            console.log(
                "Signaling server disconnected."
            );


            status.textContent =
                "Disconnected from meeting server.";

        };


    socket.onerror =
        function (error) {

            console.error(
                "WebSocket error:",
                error
            );


            status.textContent =
                "Could not connect to meeting server.";

        };

}


// ==================================================
// SIGNALING HANDLER
// ==================================================

async function handleSignalingMessage(
    message
) {

    // ==============================================
    // JOINED ROOM
    // ==============================================

    if (
        message.type ===
        "joined-room"
    ) {

        status.textContent =
            "Joined meeting room. Waiting for participant...";

        return;

    }


    // ==============================================
    // PEER JOINED
    // ==============================================

    if (
        message.type ===
        "peer-joined"
    ) {

        peerConnected =
            true;


        status.textContent =
            "Both participants are in the meeting room.";


        // ==========================================
        // INTERVIEWER CREATES OFFER
        // ==========================================

        if (
            role ===
            "interviewer"
            &&
            meetingStarted
            &&
            peerConnection
        ) {

            await createOffer();

        }


        return;

    }


    // ==============================================
    // ERROR
    // ==============================================

    if (
        message.type ===
        "error"
    ) {

        status.textContent =
            message.message ||
            "Meeting server error.";

        return;

    }


    // ==============================================
    // OFFER
    // ==============================================

    if (
        message.type ===
        "offer"
    ) {

        await handleOffer(
            message.offer
        );

        return;

    }


    // ==============================================
    // ANSWER
    // ==============================================

    if (
        message.type ===
        "answer"
    ) {

        await handleAnswer(
            message.answer
        );

        return;

    }


    // ==============================================
    // ICE
    // ==============================================

    if (
        message.type ===
        "ice-candidate"
    ) {

        if (
            peerConnection
        ) {

            try {

                await peerConnection
                    .addIceCandidate(
                        message.candidate
                    );

            }

            catch (error) {

                console.error(
                    "ICE error:",
                    error
                );

            }

        }

        return;

    }


    // ==============================================
    // PEER LEFT
    // ==============================================

    if (
        message.type ===
        "peer-left"
    ) {

        peerConnected =
            false;


        if (
            remoteVideo
        ) {

            remoteVideo.srcObject =
                null;

        }


        /*
         * Do not destroy remoteStream here.
         *
         * The recording may still be running.
         */

        status.textContent =
            "The other participant left the meeting.";

        return;

    }

}


// ==================================================
// START MEETING
// ==================================================

if (
    startMeetingButton
) {

    startMeetingButton.addEventListener(
        "click",
        async function () {

            try {

                status.textContent =
                    "Requesting camera and microphone...";


                localStream =
                    await navigator.mediaDevices
                        .getUserMedia({

                            video:
                                true,

                            audio:
                                true

                        });


                // ==================================
                // LOCAL VIDEO
                // ==================================

                if (
                    localVideo
                ) {

                    localVideo.srcObject =
                        localStream;

                }


                // ==================================
                // PEER CONNECTION
                // ==================================

                createPeerConnection();


                localStream
                    .getTracks()
                    .forEach(
                        function (
                            track
                        ) {

                            peerConnection.addTrack(
                                track,
                                localStream
                            );

                        }
                    );


                meetingStarted =
                    true;


                startMeetingButton.disabled =
                    true;


                endMeetingButton.disabled =
                    false;


                /*
                 * IMPORTANT:
                 *
                 * Recording is now available immediately.
                 *
                 * The remote participant is NOT required.
                 */

                startRecordingButton.disabled =
                    false;


                status.textContent =
                    "Meeting started. You can start recording now. Waiting for the other participant...";


                // ==================================
                // IF PEER ALREADY THERE
                // ==================================

                if (
                    role ===
                    "interviewer"
                    &&
                    peerConnected
                ) {

                    await createOffer();

                }

            }

            catch (error) {

                console.error(
                    "Start meeting error:",
                    error
                );


                status.textContent =
                    "Could not access camera or microphone. Check browser permissions.";

            }

        }
    );

}


// ==================================================
// CREATE PEER CONNECTION
// ==================================================

function createPeerConnection() {

    if (
        peerConnection
    ) {

        return;

    }


    peerConnection =
        new RTCPeerConnection(
            ICE_SERVERS
        );


    // ==============================================
    // ICE CANDIDATE
    // ==============================================

    peerConnection.onicecandidate =
        function (
            event
        ) {

            if (
                event.candidate &&
                socket &&
                socket.readyState ===
                    WebSocket.OPEN
            ) {

                socket.send(
                    JSON.stringify({

                        type:
                            "ice-candidate",

                        candidate:
                            event.candidate

                    })
                );

            }

        };


    // ==============================================
    // REMOTE TRACK
    // ==============================================

    peerConnection.ontrack =
        function (
            event
        ) {

            console.log(
                "Remote track received:",
                event.track.kind
            );


            // ======================================
            // CREATE REMOTE STREAM
            // ======================================

            if (
                !remoteStream
            ) {

                remoteStream =
                    new MediaStream();

            }


            const track =
                event.track;


            // ======================================
            // PREVENT DUPLICATE TRACK
            // ======================================

            const trackAlreadyExists =
                remoteStream
                    .getTracks()
                    .some(
                        function (
                            existingTrack
                        ) {

                            return (
                                existingTrack.id ===
                                track.id
                            );

                        }
                    );


            if (
                !trackAlreadyExists
            ) {

                remoteStream.addTrack(
                    track
                );

            }


            // ======================================
            // REMOTE VIDEO
            // ======================================

            if (
                remoteVideo
            ) {

                remoteVideo.srcObject =
                    remoteStream;


                remoteVideo.play()
                    .catch(
                        function () {}
                    );

            }


            // ======================================
            // IMPORTANT:
            // ADD REMOTE AUDIO TO ACTIVE RECORDING
            // ======================================

            if (
                track.kind ===
                "audio"
            ) {

                addRemoteAudioToRecording();

            }


            status.textContent =
                "Connected to the other participant.";

        };


    // ==============================================
    // CONNECTION STATE
    // ==============================================

    peerConnection.onconnectionstatechange =
        function () {

            if (
                !peerConnection
            ) {

                return;

            }


            console.log(
                "WebRTC connection:",
                peerConnection.connectionState
            );


            if (
                peerConnection.connectionState ===
                "connected"
            ) {

                status.textContent =
                    "🟢 Meeting connected.";

            }


            if (
                peerConnection.connectionState ===
                "disconnected"
            ) {

                status.textContent =
                    "Participant disconnected. Recording can continue.";

            }


            if (
                peerConnection.connectionState ===
                "failed"
            ) {

                status.textContent =
                    "WebRTC connection failed.";

            }

        };

}


// ==================================================
// CREATE OFFER
// ==================================================

async function createOffer() {

    if (
        !peerConnection ||
        !socket
    ) {

        return;

    }


    try {

        const offer =
            await peerConnection
                .createOffer();


        await peerConnection
            .setLocalDescription(
                offer
            );


        socket.send(
            JSON.stringify({

                type:
                    "offer",

                offer:
                    peerConnection.localDescription

            })
        );


        status.textContent =
            "Connecting to interviewee...";

    }

    catch (error) {

        console.error(
            "Offer error:",
            error
        );

    }

}


// ==================================================
// HANDLE OFFER
// ==================================================

async function handleOffer(
    offer
) {

    try {

        if (
            !peerConnection
        ) {

            createPeerConnection();

        }


        if (
            !localStream
        ) {

            localStream =
                await navigator.mediaDevices
                    .getUserMedia({

                        video:
                            true,

                        audio:
                            true

                    });


            if (
                localVideo
            ) {

                localVideo.srcObject =
                    localStream;

            }


            localStream
                .getTracks()
                .forEach(
                    function (
                        track
                    ) {

                        peerConnection.addTrack(
                            track,
                            localStream
                        );

                    }
                );


            meetingStarted =
                true;


            startMeetingButton.disabled =
                true;


            endMeetingButton.disabled =
                false;


            /*
             * The participant who receives the offer
             * can also record immediately.
             */

            startRecordingButton.disabled =
                false;

        }


        await peerConnection
            .setRemoteDescription(
                offer
            );


        const answer =
            await peerConnection
                .createAnswer();


        await peerConnection
            .setLocalDescription(
                answer
            );


        socket.send(
            JSON.stringify({

                type:
                    "answer",

                answer:
                    peerConnection.localDescription

            })
        );


        status.textContent =
            "Answer sent. Connecting...";

    }

    catch (error) {

        console.error(
            "Offer handling error:",
            error
        );


        status.textContent =
            "Could not accept the meeting connection.";

    }

}


// ==================================================
// HANDLE ANSWER
// ==================================================

async function handleAnswer(
    answer
) {

    try {

        if (
            !peerConnection
        ) {

            return;

        }


        await peerConnection
            .setRemoteDescription(
                answer
            );


        status.textContent =
            "Answer received. Connecting...";

    }

    catch (error) {

        console.error(
            "Answer error:",
            error
        );

    }

}


// ==================================================
// RECORDING BUTTON
// ==================================================

if (
    startRecordingButton
) {

    startRecordingButton.addEventListener(
        "click",
        async function () {

            try {

                await startRecording();

            }

            catch (error) {

                console.error(
                    "Recording error:",
                    error
                );


                status.textContent =
                    "Could not start recording.";

            }

        }
    );

}


// ==================================================
// START RECORDING
// ==================================================

async function startRecording() {

    // ==============================================
    // PREVENT DOUBLE RECORDING
    // ==============================================

    if (
        mediaRecorder &&
        mediaRecorder.state ===
            "recording"
    ) {

        return;

    }


    // ==============================================
    // LOCAL STREAM IS REQUIRED
    // ==============================================

    if (
        !localStream
    ) {

        status.textContent =
            "Start the meeting before recording.";

        return;

    }


    recordedChunks =
        [];


    // ==============================================
    // HIDE OLD RECORDING
    // ==============================================

    if (
        recordingPreview
    ) {

        recordingPreview.style.display =
            "none";

    }


    if (
        downloadRecording
    ) {

        downloadRecording.style.display =
            "none";

    }


    // ==============================================
    // CREATE CANVAS
    // ==============================================

    recordingCanvas =
        document.createElement(
            "canvas"
        );


    recordingCanvas.width =
        1280;


    recordingCanvas.height =
        720;


    recordingCanvasContext =
        recordingCanvas.getContext(
            "2d"
        );


    // ==============================================
    // START CANVAS ANIMATION
    // ==============================================

    drawRecordingFrame();


    const canvasStream =
        recordingCanvas.captureStream(
            30
        );


    // ==============================================
    // CREATE AUDIO CONTEXT
    // ==============================================

    const AudioContextClass =
        window.AudioContext ||
        window.webkitAudioContext;


    if (
        !AudioContextClass
    ) {

        throw new Error(
            "Web Audio API is not supported."
        );

    }


    recordingAudioContext =
        new AudioContextClass();


    // ==============================================
    // RESUME AUDIO CONTEXT
    // ==============================================

    if (
        recordingAudioContext.state ===
        "suspended"
    ) {

        await recordingAudioContext.resume();

    }


    // ==============================================
    // CREATE AUDIO DESTINATION
    // ==============================================

    recordingAudioDestination =
        recordingAudioContext
            .createMediaStreamDestination();


    // ==============================================
    // LOCAL AUDIO
    // ==============================================

    if (
        localStream &&
        localStream.getAudioTracks().length > 0
    ) {

        try {

            localAudioSource =
                recordingAudioContext
                    .createMediaStreamSource(
                        localStream
                    );


            localAudioSource.connect(
                recordingAudioDestination
            );


            console.log(
                "Local audio added to recording."
            );

        }

        catch (error) {

            console.warn(
                "Could not add local audio:",
                error
            );

        }

    }


    // ==============================================
    // REMOTE AUDIO IF ALREADY PRESENT
    // ==============================================

    addRemoteAudioToRecording();


    // ==============================================
    // ADD AUDIO TRACKS TO CANVAS STREAM
    // ==============================================

    recordingAudioDestination
        .stream
        .getAudioTracks()
        .forEach(
            function (
                track
            ) {

                canvasStream.addTrack(
                    track
                );

            }
        );


    // ==============================================
    // MIME TYPE
    // ==============================================

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

    else {

        throw new Error(
            "WebM recording is not supported."
        );

    }


    // ==============================================
    // CREATE MEDIA RECORDER
    // ==============================================

    mediaRecorder =
        new MediaRecorder(
            canvasStream,
            {
                mimeType:
                    mimeType
            }
        );


    // ==============================================
    // DATA AVAILABLE
    // ==============================================

    mediaRecorder.ondataavailable =
        function (
            event
        ) {

            if (
                event.data &&
                event.data.size > 0
            ) {

                recordedChunks.push(
                    event.data
                );

            }

        };


    // ==============================================
    // RECORDING STOPPED
    // ==============================================

    mediaRecorder.onstop =
        function () {

            finishRecording();

        };


    // ==============================================
    // RECORDING ERROR
    // ==============================================

    mediaRecorder.onerror =
        function (
            event
        ) {

            console.error(
                "MediaRecorder error:",
                event.error
            );


            status.textContent =
                "Recording error occurred.";

        };


    // ==============================================
    // START
    // ==============================================

    mediaRecorder.start(
        1000
    );


    // ==============================================
    // BUTTONS
    // ==============================================

    startRecordingButton.disabled =
        true;


    stopRecordingButton.disabled =
        false;


    // ==============================================
    // STATUS
    // ==============================================

    if (
        peerConnected
    ) {

        status.textContent =
            "🔴 Recording meeting...";

    }

    else {

        status.textContent =
            "🔴 Recording started. Waiting for participant...";

    }

}


// ==================================================
// ADD REMOTE AUDIO TO RECORDING
// ==================================================

function addRemoteAudioToRecording() {

    /*
     * If recording hasn't started yet, there is
     * nothing to do.
     */

    if (
        !recordingAudioContext ||
        !recordingAudioDestination
    ) {

        return;

    }


    /*
     * Remote stream doesn't exist yet.
     */

    if (
        !remoteStream
    ) {

        return;

    }


    /*
     * No remote audio track yet.
     */

    if (
        remoteStream.getAudioTracks().length === 0
    ) {

        return;

    }


    /*
     * Already connected.
     */

    if (
        remoteAudioSource
    ) {

        return;

    }


    try {

        remoteAudioSource =
            recordingAudioContext
                .createMediaStreamSource(
                    remoteStream
                );


        remoteAudioSource.connect(
            recordingAudioDestination
        );


        console.log(
            "Remote audio added to active recording."
        );

    }

    catch (error) {

        console.error(
            "Could not add remote audio:",
            error
        );

    }

}


// ==================================================
// DRAW RECORDING FRAME
// ==================================================

function drawRecordingFrame() {

    if (
        !recordingCanvasContext ||
        !recordingCanvas
    ) {

        return;

    }


    const ctx =
        recordingCanvasContext;


    const width =
        recordingCanvas.width;


    const height =
        recordingCanvas.height;


    // ==============================================
    // BLACK BACKGROUND
    // ==============================================

    ctx.fillStyle =
        "#000000";


    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    // ==============================================
    // LOCAL VIDEO
    // ==============================================

    drawVideoContain(
        localVideo,
        0,
        0,
        width / 2,
        height
    );


    // ==============================================
    // REMOTE VIDEO
    // ==============================================

    drawVideoContain(
        remoteVideo,
        width / 2,
        0,
        width / 2,
        height
    );


    // ==============================================
    // CENTER DIVIDER
    // ==============================================

    ctx.fillStyle =
        "#111827";


    ctx.fillRect(
        width / 2 - 2,
        0,
        4,
        height
    );


    // ==============================================
    // CONTINUE ANIMATION
    // ==============================================

    recordingAnimationFrame =
        requestAnimationFrame(
            drawRecordingFrame
        );

}


// ==================================================
// DRAW VIDEO
// ==================================================

function drawVideoContain(
    video,
    x,
    y,
    width,
    height
) {

    /*
     * If there is no video yet, simply leave
     * that half of the recording black.
     */

    if (
        !video ||
        video.readyState < 2
    ) {

        return;

    }


    const videoWidth =
        video.videoWidth;


    const videoHeight =
        video.videoHeight;


    if (
        !videoWidth ||
        !videoHeight
    ) {

        return;

    }


    const videoRatio =
        videoWidth /
        videoHeight;


    const boxRatio =
        width /
        height;


    let drawWidth =
        width;


    let drawHeight =
        height;


    let drawX =
        x;


    let drawY =
        y;


    // ==============================================
    // WIDE VIDEO
    // ==============================================

    if (
        videoRatio >
        boxRatio
    ) {

        drawHeight =
            width /
            videoRatio;


        drawY =
            y +
            (
                height -
                drawHeight
            ) /
            2;

    }

    // ==============================================
    // TALL VIDEO
    // ==============================================

    else {

        drawWidth =
            height *
            videoRatio;


        drawX =
            x +
            (
                width -
                drawWidth
            ) /
            2;

    }


    recordingCanvasContext.drawImage(
        video,
        drawX,
        drawY,
        drawWidth,
        drawHeight
    );

}


// ==================================================
// STOP RECORDING
// ==================================================

if (
    stopRecordingButton
) {

    stopRecordingButton.addEventListener(
        "click",
        function () {

            if (
                mediaRecorder &&
                mediaRecorder.state ===
                    "recording"
            ) {

                mediaRecorder.stop();

            }


            stopRecordingButton.disabled =
                true;

        }
    );

}


// ==================================================
// FINISH RECORDING
// ==================================================

function finishRecording() {

    // ==============================================
    // STOP CANVAS ANIMATION
    // ==============================================

    if (
        recordingAnimationFrame
    ) {

        cancelAnimationFrame(
            recordingAnimationFrame
        );


        recordingAnimationFrame =
            null;

    }


    // ==============================================
    // DISCONNECT LOCAL AUDIO
    // ==============================================

    if (
        localAudioSource
    ) {

        try {

            localAudioSource.disconnect();

        }

        catch (
            error
        ) {}

        localAudioSource =
            null;

    }


    // ==============================================
    // DISCONNECT REMOTE AUDIO
    // ==============================================

    if (
        remoteAudioSource
    ) {

        try {

            remoteAudioSource.disconnect();

        }

        catch (
            error
        ) {}

        remoteAudioSource =
            null;

    }


    // ==============================================
    // CLOSE AUDIO CONTEXT
    // ==============================================

    if (
        recordingAudioContext
    ) {

        recordingAudioContext
            .close()
            .catch(
                function () {}
            );


        recordingAudioContext =
            null;

    }


    recordingAudioDestination =
        null;


    // ==============================================
    // CHECK DATA
    // ==============================================

    if (
        recordedChunks.length === 0
    ) {

        status.textContent =
            "No recording data was captured.";


        startRecordingButton.disabled =
            false;


        return;

    }


    // ==============================================
    // CREATE BLOB
    // ==============================================

    const recordingBlob =
        new Blob(
            recordedChunks,
            {
                type:
                    mediaRecorder &&
                    mediaRecorder.mimeType
                        ? mediaRecorder.mimeType
                        : "video/webm"
            }
        );


    // ==============================================
    // REVOKE OLD URL
    // ==============================================

    if (
        recordingURL
    ) {

        URL.revokeObjectURL(
            recordingURL
        );

    }


    // ==============================================
    // CREATE NEW URL
    // ==============================================

    recordingURL =
        URL.createObjectURL(
            recordingBlob
        );


    // ==============================================
    // PREVIEW
    // ==============================================

    if (
        recordingPreview
    ) {

        recordingPreview.src =
            recordingURL;


        recordingPreview.style.display =
            "block";

    }


    // ==============================================
    // DOWNLOAD
    // ==============================================

    if (
        downloadRecording
    ) {

        downloadRecording.href =
            recordingURL;


        downloadRecording.download =
            `interview-${room}.webm`;


        downloadRecording.style.display =
            "inline-block";

    }


    // ==============================================
    // FILE SIZE
    // ==============================================

    const sizeMB =
        (
            recordingBlob.size /
            1024 /
            1024
        ).toFixed(2);


    // ==============================================
    // STATUS
    // ==============================================

    status.textContent =
        `Recording complete. Size: ${sizeMB} MB`;


    // ==============================================
    // BUTTONS
    // ==============================================

    startRecordingButton.disabled =
        false;


    stopRecordingButton.disabled =
        true;

}


// ==================================================
// END MEETING
// ==================================================

if (
    endMeetingButton
) {

    endMeetingButton.addEventListener(
        "click",
        function () {

            // ======================================
            // STOP RECORDING FIRST
            // ======================================

            if (
                mediaRecorder &&
                mediaRecorder.state ===
                    "recording"
            ) {

                mediaRecorder.stop();

            }


            // ======================================
            // STOP LOCAL MEDIA
            // ======================================

            if (
                localStream
            ) {

                localStream
                    .getTracks()
                    .forEach(
                        function (
                            track
                        ) {

                            track.stop();

                        }
                    );

            }


            // ======================================
            // CLOSE PEER CONNECTION
            // ======================================

            if (
                peerConnection
            ) {

                peerConnection.close();

                peerConnection =
                    null;

            }


            // ======================================
            // CLOSE SOCKET
            // ======================================

            if (
                socket
            ) {

                socket.close();

                socket =
                    null;

            }


            // ======================================
            // CLEAR LOCAL VIDEO
            // ======================================

            if (
                localVideo
            ) {

                localVideo.srcObject =
                    null;

            }


            // ======================================
            // CLEAR REMOTE VIDEO
            // ======================================

            if (
                remoteVideo
            ) {

                remoteVideo.srcObject =
                    null;

            }


            // ======================================
            // CLEAR STREAMS
            // ======================================

            localStream =
                null;


            remoteStream =
                null;


            peerConnected =
                false;


            meetingStarted =
                false;


            // ======================================
            // BUTTON STATES
            // ======================================

            startMeetingButton.disabled =
                false;


            startRecordingButton.disabled =
                true;


            stopRecordingButton.disabled =
                true;


            endMeetingButton.disabled =
                true;


            // ======================================
            // IMPORTANT
            //
            // Do NOT clear:
            //
            // recordingURL
            // recordingPreview
            // recordedChunks
            //
            // The finished recording should remain
            // available after the meeting ends.
            // ======================================

            status.textContent =
                "Meeting ended. Your recording is still available.";

        }
    );

}


// ==================================================
// BACK
// ==================================================

if (
    backButton
) {

    backButton.addEventListener(
        "click",
        function () {

            window.history.back();

        }
    );

}