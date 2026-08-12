"use strict";


// ==========================================
// BACK BUTTON
// ==========================================

const backButton =
    document.getElementById(
        "backButton"
    );


if (backButton) {

    backButton.addEventListener(
        "click",
        function () {

            console.log(
                "Back button clicked."
            );


            window.location.href = "../index.html";
        }
    );

}


// ==========================================
// HTML ELEMENTS
// ==========================================

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


// ==========================================
// TEMPORARY INVITE CODE
// ==========================================

const VALID_INVITE_CODE =
    "123";


// ==========================================
// VERIFY INVITE CODE
// ==========================================

if (verifyCodeButton) {

    verifyCodeButton.addEventListener(
        "click",
        function () {


            const enteredCode =
                inviteCodeInput.value.trim();


            // ===============================
            // EMPTY CODE
            // ===============================

            if (enteredCode === "") {

                status.textContent =
                    "Please enter an invite code.";

                status.className =
                    "error";

                return;

            }


            // ===============================
            // CORRECT CODE
            // ===============================

            if (
                enteredCode ===
                VALID_INVITE_CODE
            ) {


                status.textContent =
                    "Invite code accepted!";

                status.className =
                    "success";


                // ===============================
                // Go to Resume Page
                // ===============================

                setTimeout(
                    function () {

                        window.location.href =
                            "resume.html";

                    },
                    500
                );


                return;

            }


            // ===============================
            // INCORRECT CODE
            // ===============================

            status.textContent =
                "Invalid invite code. Please try again.";

            status.className =
                "error";

        }
    );

}