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
// RECORDING
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
    "ws://localhost:8080";


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
// CONNECT SIGNALING
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
    // JOINED
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


        status.textContent =
            "The other participant left the meeting.";

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


                localVideo.srcObject =
                    localStream;


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


                status.textContent =
                    "Meeting started. Waiting for the other participant...";


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
    // ICE
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

            if (
                event.streams &&
                event.streams[0]
            ) {

                remoteStream =
                    event.streams[0];

            }
            else {

                if (
                    !remoteStream
                ) {

                    remoteStream =
                        new MediaStream();

                }


                remoteStream.addTrack(
                    event.track
                );

            }


            remoteVideo.srcObject =
                remoteStream;


            remoteVideo.play()
                .catch(
                    function () {}
                );


            status.textContent =
                "Connected to the other participant.";

        };


    // ==============================================
    // CONNECTION STATE
    // ==============================================

    peerConnection.onconnectionstatechange =
        function () {

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


                if (
                    startRecordingButton
                ) {

                    startRecordingButton.disabled =
                        false;

                }

            }


            if (
                peerConnection.connectionState ===
                "disconnected"
            ) {

                status.textContent =
                    "Participant disconnected.";

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


            localVideo.srcObject =
                localStream;


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
// RECORDING
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


async function startRecording() {

    if (
        !localStream
    ) {

        return;

    }


    recordedChunks = [];


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
    // CANVAS
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


    drawRecordingFrame();


    const canvasStream =
        recordingCanvas.captureStream(
            30
        );


    // ==============================================
    // AUDIO
    // ==============================================

    recordingAudioContext =
        new AudioContext();


    recordingAudioDestination =
        recordingAudioContext
            .createMediaStreamDestination();


    try {

        localAudioSource =
            recordingAudioContext
                .createMediaStreamSource(
                    localStream
                );


        localAudioSource.connect(
            recordingAudioDestination
        );

    }

    catch (error) {

        console.warn(
            "Local audio error:",
            error
        );

    }


    if (
        remoteStream
    ) {

        try {

            remoteAudioSource =
                recordingAudioContext
                    .createMediaStreamSource(
                        remoteStream
                    );


            remoteAudioSource.connect(
                recordingAudioDestination
            );

        }

        catch (error) {

            console.warn(
                "Remote audio error:",
                error
            );

        }

    }


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

    let mimeType = "";


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
    else {

        mimeType =
            "video/webm";

    }


    mediaRecorder =
        new MediaRecorder(
            canvasStream,
            {
                mimeType:
                    mimeType
            }
        );


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


    mediaRecorder.onstop =
        function () {

            finishRecording();

        };


    mediaRecorder.start(
        1000
    );


    startRecordingButton.disabled =
        true;


    stopRecordingButton.disabled =
        false;


    status.textContent =
        "🔴 Recording meeting...";

}


// ==================================================
// DRAW RECORDING
// ==================================================

function drawRecordingFrame() {

    if (
        !recordingCanvasContext
    ) {

        return;

    }


    const ctx =
        recordingCanvasContext;


    const width =
        recordingCanvas.width;


    const height =
        recordingCanvas.height;


    ctx.fillStyle =
        "#000000";


    ctx.fillRect(
        0,
        0,
        width,
        height
    );


    drawVideoContain(
        localVideo,
        0,
        0,
        width / 2,
        height
    );


    drawVideoContain(
        remoteVideo,
        width / 2,
        0,
        width / 2,
        height
    );


    ctx.fillStyle =
        "#111827";


    ctx.fillRect(
        width / 2 - 2,
        0,
        4,
        height
    );


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

    if (
        recordingAnimationFrame
    ) {

        cancelAnimationFrame(
            recordingAnimationFrame
        );


        recordingAnimationFrame =
            null;

    }


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


    if (
        recordedChunks.length === 0
    ) {

        status.textContent =
            "No recording data was captured.";

        return;

    }


    const recordingBlob =
        new Blob(
            recordedChunks,
            {
                type:
                    mediaRecorder.mimeType ||
                    "video/webm"
            }
        );


    recordingURL =
        URL.createObjectURL(
            recordingBlob
        );


    recordingPreview.src =
        recordingURL;


    recordingPreview.style.display =
        "block";


    downloadRecording.href =
        recordingURL;


    downloadRecording.download =
        `interview-${room}.webm`;


    downloadRecording.style.display =
        "inline-block";


    const sizeMB =
        (
            recordingBlob.size /
            1024 /
            1024
        ).toFixed(2);


    status.textContent =
        `Recording complete. Size: ${sizeMB} MB`;


    startRecordingButton.disabled =
        false;

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

            if (
                mediaRecorder &&
                mediaRecorder.state ===
                    "recording"
            ) {

                mediaRecorder.stop();

            }


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


            if (
                peerConnection
            ) {

                peerConnection.close();

                peerConnection =
                    null;

            }


            if (
                socket
            ) {

                socket.close();

            }


            localVideo.srcObject =
                null;


            remoteVideo.srcObject =
                null;


            localStream =
                null;


            remoteStream =
                null;


            meetingStarted =
                false;


            startMeetingButton.disabled =
                false;


            startRecordingButton.disabled =
                true;


            stopRecordingButton.disabled =
                true;


            endMeetingButton.disabled =
                true;


            status.textContent =
                "Meeting ended.";

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