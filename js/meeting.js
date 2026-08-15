"use strict";


// ==================================================
// URL / ROOM INFORMATION
// ==================================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );


const role =
    urlParams.get("role");


const room =
    urlParams.get("room");


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
// VALIDATE ROOM
// ==================================================

if (!role || !room) {

    status.textContent =
        "Invalid meeting URL.";

    startMeetingButton.disabled =
        true;

}


// ==================================================
// DISPLAY ROOM
// ==================================================

if (roomDisplay && room) {

    roomDisplay.textContent =
        `Room: ${room}`;

}


// ==================================================
// VARIABLES
// ==================================================

let localStream = null;

let remoteStream = null;

let peerConnection = null;

let socket = null;

let peerConnected = false;

let meetingStarted = false;


// ==================================================
// RECORDING VARIABLES
// ==================================================

let mediaRecorder = null;

let recordedChunks = [];

let recordingURL = null;

let recordingCanvas = null;

let recordingCanvasContext = null;

let recordingAnimationFrame = null;

let recordingAudioContext = null;

let recordingAudioDestination = null;

let localAudioSource = null;

let remoteAudioSource = null;


// ==================================================
// WEBSOCKET SERVER
// ==================================================
//
// Development:
// localhost:8080
//
// When deployed with HTTPS, this should become:
// wss://your-domain.com
// ==================================================

const SIGNALING_SERVER =
    "ws://localhost:8080";


// ==================================================
// ICE SERVERS
// ==================================================
//
// STUN helps peers discover possible network
// paths.
//
// For production, add a TURN server too.
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
// INITIALIZATION
// ==================================================

initialize();


async function initialize() {

    if (!role || !room) {

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


    // ==============================================
    // CONNECT TO SIGNALING SERVER
    // ==============================================

    connectToSignalingServer();

}


// ==================================================
// SIGNALING SERVER CONNECTION
// ==================================================

function connectToSignalingServer() {

    status.textContent =
        "Connecting to meeting server...";


    socket =
        new WebSocket(
            SIGNALING_SERVER
        );


    // ==============================================
    // OPEN
    // ==============================================

    socket.onopen =
        function () {

            console.log(
                "Connected to signaling server."
            );


            status.textContent =
                "Connected. Waiting to join meeting...";


            socket.send(
                JSON.stringify({

                    type:
                        "join-room",

                    room:
                        room,

                    role:
                        role

                })
            );

        };


    // ==============================================
    // MESSAGE
    // ==============================================

    socket.onmessage =
        async function (event) {

            try {

                const message =
                    JSON.parse(
                        event.data
                    );


                await handleSignalingMessage(
                    message
                );

            }

            catch (error) {

                console.error(
                    "Signaling message error:",
                    error
                );

            }

        };


    // ==============================================
    // CLOSE
    // ==============================================

    socket.onclose =
        function () {

            console.log(
                "Signaling server disconnected."
            );


            status.textContent =
                "Disconnected from meeting server.";

        };


    // ==============================================
    // ERROR
    // ==============================================

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
// SIGNALING MESSAGE HANDLER
// ==================================================

async function handleSignalingMessage(
    message
) {

    console.log(
        "Signaling message:",
        message.type
    );


    // ==================================================
    // ROOM JOINED
    // ==================================================

    if (
        message.type ===
        "room-joined"
    ) {

        status.textContent =
            "Joined meeting room. Click Start Meeting.";

        return;

    }


    // ==================================================
    // PEER WAITING
    // ==================================================

    if (
        message.type ===
        "peer-waiting"
    ) {

        status.textContent =
            "Waiting for the other participant...";

        return;

    }


    // ==================================================
    // PEER READY
    // ==================================================

    if (
        message.type ===
        "peer-ready"
    ) {

        peerConnected =
            true;


        status.textContent =
            "Both participants are in the room.";

        return;

    }


    // ==================================================
    // OFFER
    // ==================================================

    if (
        message.type ===
        "offer"
    ) {

        await handleOffer(
            message.offer
        );

        return;

    }


    // ==================================================
    // ANSWER
    // ==================================================

    if (
        message.type ===
        "answer"
    ) {

        await handleAnswer(
            message.answer
        );

        return;

    }


    // ==================================================
    // ICE CANDIDATE
    // ==================================================

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
                    "ICE candidate error:",
                    error
                );

            }

        }

        return;

    }


    // ==================================================
    // PEER LEFT
    // ==================================================

    if (
        message.type ===
        "peer-left"
    ) {

        peerConnected =
            false;


        remoteVideo.srcObject =
            null;


        status.textContent =
            "The other participant left the meeting.";

        return;

    }


    // ==================================================
    // ROOM FULL
    // ==================================================

    if (
        message.type ===
        "room-full"
    ) {

        status.textContent =
            "This meeting room already has two participants.";

        startMeetingButton.disabled =
            true;

        return;

    }

}


// ==================================================
// START MEETING
// ==================================================

startMeetingButton.addEventListener(
    "click",
    async function () {

        try {

            status.textContent =
                "Requesting camera and microphone...";


            // ==========================================
            // GET CAMERA + MICROPHONE
            // ==========================================

            localStream =
                await navigator.mediaDevices
                    .getUserMedia({

                        video: true,

                        audio: true

                    });


            // ==========================================
            // SHOW LOCAL VIDEO
            // ==========================================

            localVideo.srcObject =
                localStream;


            // ==========================================
            // CREATE PEER CONNECTION
            // ==========================================

            createPeerConnection();


            // ==========================================
            // ADD LOCAL TRACKS
            // ==========================================

            localStream
                .getTracks()
                .forEach(
                    function (track) {

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


            // ==========================================
            // INTERVIEWER CREATES OFFER
            // ==========================================

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
                "Could not start meeting:",
                error
            );


            status.textContent =
                "Could not access the camera or microphone. Please check browser permissions.";

        }

    }
);


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
        function (event) {

            if (
                event.candidate
                &&
                socket
                &&
                socket.readyState ===
                    WebSocket.OPEN
            ) {

                socket.send(
                    JSON.stringify({

                        type:
                            "ice-candidate",

                        room:
                            room,

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
        function (event) {

            console.log(
                "Remote track received."
            );


            if (
                event.streams
                &&
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
                    function () {

                        console.log(
                            "Remote video requires user interaction."
                        );

                    }
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
                "Connection state:",
                peerConnection.connectionState
            );


            if (
                peerConnection.connectionState ===
                "connected"
            ) {

                status.textContent =
                    "🟢 Meeting connected.";

                startRecordingButton.disabled =
                    false;

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
        !peerConnection
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

                room:
                    room,

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

        // ==========================================
        // CREATE CONNECTION IF NECESSARY
        // ==========================================

        if (
            !peerConnection
        ) {

            createPeerConnection();

        }


        // ==========================================
        // GET LOCAL CAMERA
        // ==========================================

        if (
            !localStream
        ) {

            localStream =
                await navigator.mediaDevices
                    .getUserMedia({

                        video: true,

                        audio: true

                    });


            localVideo.srcObject =
                localStream;


            localStream
                .getTracks()
                .forEach(
                    function (track) {

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


        // ==========================================
        // SET REMOTE DESCRIPTION
        // ==========================================

        await peerConnection
            .setRemoteDescription(
                offer
            );


        // ==========================================
        // CREATE ANSWER
        // ==========================================

        const answer =
            await peerConnection
                .createAnswer();


        await peerConnection
            .setLocalDescription(
                answer
            );


        // ==========================================
        // SEND ANSWER
        // ==========================================

        socket.send(
            JSON.stringify({

                type:
                    "answer",

                room:
                    room,

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
// START RECORDING
// ==================================================

startRecordingButton.addEventListener(
    "click",
    async function () {

        if (
            !localStream
        ) {

            status.textContent =
                "Start the meeting first.";

            return;

        }


        if (
            mediaRecorder
            &&
            mediaRecorder.state ===
                "recording"
        ) {

            return;

        }


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


// ==================================================
// CREATE RECORDING STREAM
// ==================================================

async function startRecording() {

    recordedChunks = [];


    // ==============================================
    // RESET OLD RECORDING
    // ==============================================

    recordingPreview.style.display =
        "none";


    downloadRecording.style.display =
        "none";


    if (
        recordingURL
    ) {

        URL.revokeObjectURL(
            recordingURL
        );

        recordingURL =
            null;

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
    // START DRAWING VIDEOS
    // ==============================================

    drawRecordingFrame();


    // ==============================================
    // CANVAS VIDEO STREAM
    // ==============================================

    const canvasStream =
        recordingCanvas.captureStream(
            30
        );


    // ==============================================
    // AUDIO CONTEXT
    // ==============================================

    recordingAudioContext =
        new AudioContext();


    recordingAudioDestination =
        recordingAudioContext
            .createMediaStreamDestination();


    // ==============================================
    // LOCAL AUDIO
    // ==============================================

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
            "Could not add local audio:",
            error
        );

    }


    // ==============================================
    // REMOTE AUDIO
    // ==============================================

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
                "Could not add remote audio:",
                error
            );

        }

    }


    // ==============================================
    // ADD AUDIO TO CANVAS STREAM
    // ==============================================

    const audioTracks =
        recordingAudioDestination
            .stream
            .getAudioTracks();


    audioTracks.forEach(
        function (track) {

            canvasStream.addTrack(
                track
            );

        }
    );


    // ==============================================
    // FIND RECORDING FORMAT
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

    else if (
        MediaRecorder.isTypeSupported(
            "video/webm"
        )
    ) {

        mimeType =
            "video/webm";

    }


    // ==============================================
    // CREATE MEDIA RECORDER
    // ==============================================

    if (
        mimeType
    ) {

        mediaRecorder =
            new MediaRecorder(
                canvasStream,
                {
                    mimeType:
                        mimeType
                }
            );

    }

    else {

        mediaRecorder =
            new MediaRecorder(
                canvasStream
            );

    }


    // ==============================================
    // DATA AVAILABLE
    // ==============================================

    mediaRecorder.ondataavailable =
        function (event) {

            if (
                event.data
                &&
                event.data.size > 0
            ) {

                recordedChunks.push(
                    event.data
                );

            }

        };


    // ==============================================
    // STOPPED
    // ==============================================

    mediaRecorder.onstop =
        function () {

            finishRecording();

        };


    // ==============================================
    // ERROR
    // ==============================================

    mediaRecorder.onerror =
        function (event) {

            console.error(
                "MediaRecorder error:",
                event.error
            );


            status.textContent =
                "Recording error.";

        };


    // ==============================================
    // START
    // ==============================================

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
// DRAW RECORDING FRAME
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


    // ==============================================
    // BACKGROUND
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
    // DRAW LOCAL VIDEO
    // ==============================================

    drawVideoContain(
        localVideo,
        0,
        0,
        width / 2,
        height
    );


    // ==============================================
    // DRAW REMOTE VIDEO
    // ==============================================

    drawVideoContain(
        remoteVideo,
        width / 2,
        0,
        width / 2,
        height
    );


    // ==============================================
    // DIVIDER
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
    // LABELS
    // ==============================================

    ctx.fillStyle =
        "rgba(0,0,0,0.65)";


    ctx.fillRect(
        20,
        height - 55,
        130,
        35
    );


    ctx.fillRect(
        width / 2 + 20,
        height - 55,
        180,
        35
    );


    ctx.fillStyle =
        "#ffffff";


    ctx.font =
        "18px Arial";


    ctx.fillText(
        "You",
        35,
        height - 32
    );


    ctx.fillText(
        "Other Participant",
        width / 2 + 35,
        height - 32
    );


    recordingAnimationFrame =
        requestAnimationFrame(
            drawRecordingFrame
        );

}


// ==================================================
// DRAW VIDEO WITH CONTAIN
// ==================================================

function drawVideoContain(
    video,
    x,
    y,
    width,
    height
) {

    if (
        !video
        ||
        video.readyState <
            2
    ) {

        return;

    }


    const videoWidth =
        video.videoWidth;


    const videoHeight =
        video.videoHeight;


    if (
        !videoWidth
        ||
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

stopRecordingButton.addEventListener(
    "click",
    function () {

        if (
            mediaRecorder
            &&
            mediaRecorder.state ===
                "recording"
        ) {

            mediaRecorder.stop();

        }


        stopRecordingButton.disabled =
            true;

    }
);


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


    // ==============================================
    // CHECK DATA
    // ==============================================

    if (
        recordedChunks.length === 0
    ) {

        status.textContent =
            "No recording data was captured.";

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
                    mediaRecorder.mimeType ||
                    "video/webm"
            }
        );


    // ==============================================
    // CREATE URL
    // ==============================================

    recordingURL =
        URL.createObjectURL(
            recordingBlob
        );


    // ==============================================
    // SHOW PREVIEW
    // ==============================================

    recordingPreview.src =
        recordingURL;


    recordingPreview.style.display =
        "block";


    // ==============================================
    // DOWNLOAD
    // ==============================================

    downloadRecording.href =
        recordingURL;


    downloadRecording.download =
        `interview-${room}.webm`;


    downloadRecording.style.display =
        "inline-block";


    // ==============================================
    // STATUS
    // ==============================================

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

endMeetingButton.addEventListener(
    "click",
    function () {

        // ==========================================
        // STOP RECORDING
        // ==========================================

        if (
            mediaRecorder
            &&
            mediaRecorder.state ===
                "recording"
        ) {

            mediaRecorder.stop();

        }


        // ==========================================
        // STOP CAMERA + MICROPHONE
        // ==========================================

        if (
            localStream
        ) {

            localStream
                .getTracks()
                .forEach(
                    function (track) {

                        track.stop();

                    }
                );

        }


        // ==========================================
        // CLOSE PEER CONNECTION
        // ==========================================

        if (
            peerConnection
        ) {

            peerConnection.close();

            peerConnection =
                null;

        }


        // ==========================================
        // CLOSE WEBSOCKET
        // ==========================================

        if (
            socket
        ) {

            socket.close();

        }


        // ==========================================
        // CLEAR VIDEO
        // ==========================================

        localVideo.srcObject =
            null;


        remoteVideo.srcObject =
            null;


        // ==========================================
        // RESET
        // ==========================================

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


// ==================================================
// BACK BUTTON
// ==================================================

backButton.addEventListener(
    "click",
    function () {

        window.history.back();

    }
);