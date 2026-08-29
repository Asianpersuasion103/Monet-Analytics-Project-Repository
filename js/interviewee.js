"use strict";


// ==================================================
// SERVER
// ==================================================

const SERVER_URL = window.location.origin;
    
// ==================================================
// HTML ELEMENTS
// ==================================================

const backButton =
    document.getElementById(
        "backButton"
    );


const inviteCodeInput =
    document.getElementById(
        "inviteCode"
    );

const urlParams = 
    new URLSearchParams(
        window.location.search
    );

const codeFromURL = 
    urlParams.get("code");

if(codeFromURL) {
    inviteCodeInput.value = 
        codeFromURL.trim().toUpperCase(); 
}

const verifyCodeButton =
    document.getElementById(
        "verifyCodeButton"
    );


const status =
    document.getElementById(
        "status"
    );


// ==================================================
// BACK BUTTON
// ==================================================

if (backButton) {

    backButton.addEventListener(
        "click",
        function () {

            window.location.href =
                "../index.html";

        }
    );

}


// ==================================================
// VERIFY INVITE CODE
// ==================================================

async function verifyInviteCode() {

    const enteredCode =
        inviteCodeInput.value
            .trim()
            .toUpperCase();


    // ==============================================
    // EMPTY
    // ==============================================

    if (
        enteredCode === ""
    ) {

        status.textContent =
            "Please enter an invite code.";

        status.className =
            "error";

        return;

    }


    // ==============================================
    // BUTTON
    // ==============================================

    verifyCodeButton.disabled =
        true;


    status.textContent =
        "Checking invite code...";

    status.className =
        "";


    try {

        const response =
            await fetch(
                SERVER_URL +
                "/api/verify-invite",
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            inviteCode:
                                enteredCode
                        })
                }
            );


        const data =
            await response.json();


        // ==========================================
        // INVALID
        // ==========================================

        if (
            !response.ok ||
            !data.valid
        ) {

            status.textContent =
                data.message ||
                "Invalid or expired invite code.";

            status.className =
                "error";


            inviteCodeInput.value =
                "";


            inviteCodeInput.focus();


            verifyCodeButton.disabled =
                false;


            return;

        }


        // ==========================================
        // VALID
        // ==========================================

        const room =
            data.room ||
            enteredCode;


        sessionStorage.setItem(
            "meetingRole",
            "interviewee"
        );


        sessionStorage.setItem(
            "meetingRoom",
            room
        );


        sessionStorage.setItem(
            "inviteCode",
            room
        );


        status.textContent =
            "Invite code accepted!";

        status.className =
            "success";


        console.log(
            "Invite accepted:",
            room
        );


        // ==========================================
        // GO TO RESUME
        // ==========================================

        setTimeout(
            function () {

                window.location.href =
                    "resume.html";

            },
            500
        );

    }

    catch (error) {

        console.error(
            "Invite verification error:",
            error
        );


        status.textContent =
            "Could not connect to the meeting server.";

        status.className =
            "error";


        verifyCodeButton.disabled =
            false;

    }

}


// ==================================================
// BUTTON
// ==================================================

if (verifyCodeButton) {

    verifyCodeButton.addEventListener(
        "click",
        verifyInviteCode
    );

}


// ==================================================
// ENTER KEY
// ==================================================

if (inviteCodeInput) {

    inviteCodeInput.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key ===
                "Enter"
            ) {

                event.preventDefault();

                verifyInviteCode();

            }

        }
    );

}


// ==================================================
// DEBUG
// ==================================================

console.log(
    "interviewee.js loaded successfully."
);