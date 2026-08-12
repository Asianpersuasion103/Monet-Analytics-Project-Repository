"use strict";


// ==================================================
// INVITE CODE ELEMENTS
// ==================================================

const inviteCode =
    document.getElementById(
        "inviteCode"
    );


const verifyCodeButton =
    document.getElementById(
        "verifyCodeButton"
    );


const inviteStatus =
    document.getElementById(
        "inviteStatus"
    );


const inviteSection =
    document.getElementById(
        "inviteSection"
    );


const meetingSection =
    document.getElementById(
        "meetingSection"
    );


// ==================================================
// MEETING ELEMENTS
// ==================================================

const backButton =
    document.getElementById(
        "backButton"
    );


const videoPreview =
    document.getElementById(
        "videoPreview"
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


const status =
    document.getElementById(
        "status"
    );


// ==================================================
// RECORDING ELEMENTS
// ==================================================

const recordingPreview =
    document.getElementById(
        "recordingPreview"
    );


const downloadRecording =
    document.getElementById(
        "downloadRecording"
    );


// ==================================================
// VARIABLES
// ==================================================

let mediaStream = null;

let mediaRecorder = null;

let recordedChunks = [];

let recordingURL = null;


// ==================================================
// TEMPORARY INVITE CODE
// ==================================================
//
// Change this to whatever code you want.
//
// Example:
// ABC123
//
// ==================================================

const VALID_INVITE_CODE =
    "123";


// ==================================================
// BACK BUTTON
// ==================================================

if (backButton) {

    backButton.addEventListener(
        "click",
        function () {

            // Return to role-selection page

            window.location.href =
                "index.html";

        }
    );

}


// ==================================================
// VERIFY INVITE CODE
// ==================================================

if (verifyCodeButton) {

    verifyCodeButton.addEventListener(
        "click",
        function () {

            const enteredCode =
                inviteCode.value.trim();


            // ======================================
            // EMPTY CODE
            // ======================================

            if (enteredCode === "") {

                inviteStatus.textContent =
                    "Please enter an invite code.";

                inviteStatus.style.color =
                    "#dc2626";

                return;

            }


            // ======================================
            // CORRECT CODE
            // ======================================

            if (
                enteredCode ===
                VALID_INVITE_CODE
            ) {

                console.log(
                    "Invite code accepted."
                );


                inviteStatus.textContent =
                    "Invite code accepted.";

                inviteStatus.style.color =
                    "#16a34a";


                // Hide invite screen

                inviteSection.style.display =
                    "none";


                // Show meeting screen

                meetingSection.style.display =
                    "block";


                status.textContent =
                    "Invite accepted. Ready to start meeting.";

            }


            // ======================================
            // INCORRECT CODE
            // ======================================

            else {

                console.log(
                    "Invalid invite code."
                );


                inviteStatus.textContent =
                    "Invalid invite code. Please try again.";

                inviteStatus.style.color =
                    "#dc2626";


                // Clear input

                inviteCode.value = "";

                inviteCode.focus();

            }

        }
    );

}


// ==================================================
// ALLOW ENTER KEY FOR INVITE CODE
// ==================================================

if (inviteCode) {

    inviteCode.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key ===
                "Enter"
            ) {

                verifyCodeButton.click();

            }

        }
    );

}


// ==================================================
// START MEETING
// ==================================================

if (startMeetingButton) {

    startMeetingButton.addEventListener(
        "click",
        async function () {

            try {

                status.textContent =
                    "Requesting camera and microphone permission...";


                // ==================================
                // REQUEST CAMERA + MICROPHONE
                // ==================================

                mediaStream =
                    await navigator.mediaDevices
                        .getUserMedia({

                            video: true,

                            audio: true

                        });


                // ==================================
                // SHOW CAMERA
                // ==================================

                videoPreview.srcObject =
                    mediaStream;


                // ==================================
                // UPDATE BUTTONS
                // ==================================

                startMeetingButton.disabled =
                    true;


                startRecordingButton.disabled =
                    false;


                endMeetingButton.disabled =
                    false;


                status.textContent =
                    "Meeting started. Camera and microphone are active.";

            }

            catch (error) {

                console.error(
                    "Camera/microphone error:",
                    error
                );


                status.textContent =
                    "Could not access the camera or microphone. Please check your browser permissions.";

            }

        }
    );

}


// ==================================================
// START RECORDING
// ==================================================

if (startRecordingButton) {

    startRecordingButton.addEventListener(
        "click",
        function () {


            // ======================================
            // MAKE SURE CAMERA IS RUNNING
            // ======================================

            if (!mediaStream) {

                status.textContent =
                    "Please start the meeting first.";

                return;

            }


            // ======================================
            // RESET OLD RECORDING
            // ======================================

            recordedChunks = [];


            // Hide old preview

            recordingPreview.style.display =
                "none";


            // Hide old download

            downloadRecording.style.display =
                "none";


            // Remove old URL

            if (recordingURL) {

                URL.revokeObjectURL(
                    recordingURL
                );

                recordingURL = null;

            }


            // ======================================
            // CREATE MEDIA RECORDER
            // ======================================

            try {

                mediaRecorder =
                    new MediaRecorder(
                        mediaStream
                    );

            }

            catch (error) {

                console.error(
                    "MediaRecorder error:",
                    error
                );


                status.textContent =
                    "This browser does not support recording.";

                return;

            }


            // ======================================
            // RECEIVE RECORDED DATA
            // ======================================

            mediaRecorder.ondataavailable =
                function (event) {

                    if (
                        event.data &&
                        event.data.size > 0
                    ) {

                        recordedChunks.push(
                            event.data
                        );

                    }

                };


            // ======================================
            // RECORDING STOPPED
            // ======================================

            mediaRecorder.onstop =
                function () {

                    console.log(
                        "Recording stopped."
                    );


                    // ==================================
                    // CREATE WEBM BLOB
                    // ==================================

                    const recordingBlob =
                        new Blob(
                            recordedChunks,
                            {
                                type:
                                    "video/webm"
                            }
                        );


                    console.log(
                        "Recording size:",
                        recordingBlob.size,
                        "bytes"
                    );


                    // ==================================
                    // CREATE TEMPORARY URL
                    // ==================================

                    recordingURL =
                        URL.createObjectURL(
                            recordingBlob
                        );


                    // ==================================
                    // SET VIDEO SOURCE
                    // ==================================

                    recordingPreview.src =
                        recordingURL;


                    // Show recorded video

                    recordingPreview.style.display =
                        "block";


                    // ==================================
                    // SET DOWNLOAD LINK
                    // ==================================

                    downloadRecording.href =
                        recordingURL;


                    downloadRecording.style.display =
                        "inline-block";


                    status.textContent =
                        "Recording finished. You can play the recording below.";

                };


            // ======================================
            // RECORDING ERROR
            // ======================================

            mediaRecorder.onerror =
                function (event) {

                    console.error(
                        "Recording error:",
                        event.error
                    );


                    status.textContent =
                        "An error occurred during recording.";

                };


            // ======================================
            // START
            // ======================================

            mediaRecorder.start();


            // ======================================
            // UPDATE BUTTONS
            // ======================================

            startRecordingButton.disabled =
                true;


            stopRecordingButton.disabled =
                false;


            status.textContent =
                "Recording...";

        }
    );

}


// ==================================================
// STOP RECORDING
// ==================================================

if (stopRecordingButton) {

    stopRecordingButton.addEventListener(
        "click",
        function () {


            if (
                mediaRecorder &&
                mediaRecorder.state !==
                    "inactive"
            ) {

                mediaRecorder.stop();

            }


            startRecordingButton.disabled =
                false;


            stopRecordingButton.disabled =
                true;

        }
    );

}


// ==================================================
// END MEETING
// ==================================================

if (endMeetingButton) {

    endMeetingButton.addEventListener(
        "click",
        function () {


            // ======================================
            // STOP RECORDING
            // ======================================

            if (
                mediaRecorder &&
                mediaRecorder.state !==
                    "inactive"
            ) {

                mediaRecorder.stop();

            }


            // ======================================
            // STOP CAMERA + MICROPHONE
            // ======================================

            if (mediaStream) {

                mediaStream
                    .getTracks()
                    .forEach(
                        function (track) {

                            track.stop();

                        }
                    );

            }


            // ======================================
            // REMOVE CAMERA
            // ======================================

            videoPreview.srcObject =
                null;


            // ======================================
            // RESET MEDIA
            // ======================================

            mediaStream =
                null;


            mediaRecorder =
                null;


            // ======================================
            // RESET BUTTONS
            // ======================================

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