"use strict";


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


const verifyCodeButton =
    document.getElementById(
        "verifyCodeButton"
    );


const status =
    document.getElementById(
        "status"
    );


// ==================================================
// SERVER URL
// ==================================================

const SERVER_URL =
    "http://localhost:8080";


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

if (verifyCodeButton) {

    verifyCodeButton.addEventListener(
        "click",
        async function () {

            const enteredCode =
                inviteCodeInput.value
                    .trim()
                    .toUpperCase();


            // ======================================
            // EMPTY CODE
            // ======================================

            if (
                enteredCode === ""
            ) {

                status.textContent =
                    "Please enter an invite code.";

                status.className =
                    "error";

                return;

            }


            // ======================================
            // DISABLE BUTTON
            // ======================================

            verifyCodeButton.disabled =
                true;


            status.textContent =
                "Checking invite code...";

            status.className =
                "";


            try {

                // ==================================
                // ASK SERVER
                // ==================================

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


                const result =
                    await response.json();


                // ==================================
                // INVALID
                // ==================================

                if (
                    !response.ok ||
                    !result.valid
                ) {

                    status.textContent =
                        result.message ||
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


                // ==================================
                // VALID
                // ==================================

                console.log(
                    "Invite accepted.",
                    result
                );


                // ==================================
                // SAVE ROLE
                // ==================================

                sessionStorage.setItem(
                    "meetingRole",
                    "interviewee"
                );


                // ==================================
                // SAVE ROOM
                // ==================================

                sessionStorage.setItem(
                    "meetingRoom",
                    result.room
                );


                // ==================================
                // SAVE INVITE CODE
                // ==================================

                sessionStorage.setItem(
                    "inviteCode",
                    enteredCode
                );


                // ==================================
                // SUCCESS
                // ==================================

                status.textContent =
                    "Invite code accepted!";

                status.className =
                    "success";


                // ==================================
                // GO TO RESUME
                // ==================================

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


                verifyCodeButton.click();

            }

        }
    );

}


console.log(
    "interviewee.js loaded successfully."
);