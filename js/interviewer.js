"use strict";


// ==================================================
// HTML ELEMENTS
// ==================================================

const backButton =
    document.getElementById(
        "backButton"
    );


const createMeetingButton =
    document.getElementById(
        "createMeetingButton"
    );


const inviteStatus =
    document.getElementById(
        "inviteStatus"
    );


const meetingSection =
    document.getElementById(
        "meetingSection"
    );


const inviteCodeDisplay =
    document.getElementById(
        "inviteCodeDisplay"
    );


const copyCodeButton =
    document.getElementById(
        "copyCodeButton"
    );


const openMeetingButton =
    document.getElementById(
        "openMeetingButton"
    );


// ==================================================
// VARIABLES
// ==================================================

let meetingCode = null;


// ==================================================
// BACK BUTTON
// ==================================================

if (backButton) {

    backButton.addEventListener(
        "click",
        function () {

            console.log(
                "Back button clicked."
            );


            window.location.href =
                "../index.html";

        }
    );

}


// ==================================================
// GENERATE RANDOM MEETING CODE
// ==================================================

function generateMeetingCode() {

    /*
     * Characters intentionally exclude
     * confusing characters such as:
     *
     * 0
     * O
     * I
     * 1
     *
     * This makes the code easier to read
     * over the phone or in person.
     */

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


    const randomValues =
        new Uint32Array(8);


    crypto.getRandomValues(
        randomValues
    );


    let code = "";


    for (
        let i = 0;
        i < randomValues.length;
        i++
    ) {

        code +=
            characters[
                randomValues[i] %
                characters.length
            ];

    }


    // ==========================================
    // FORMAT
    // ==========================================
    //
    // Example:
    //
    // ABCD-EFGH
    //
    // ==========================================

    return (
        code.substring(0, 4) +
        "-" +
        code.substring(4, 8)
    );

}


// ==================================================
// CREATE MEETING
// ==================================================

if (createMeetingButton) {

    createMeetingButton.addEventListener(
        "click",
        function () {

            console.log(
                "Create Meeting clicked."
            );


            // ======================================
            // GENERATE CODE
            // ======================================

            meetingCode =
                generateMeetingCode();


            console.log(
                "Generated meeting code:",
                meetingCode
            );


            // ======================================
            // SAVE ROLE
            // ======================================

            sessionStorage.setItem(
                "meetingRole",
                "interviewer"
            );


            // ======================================
            // SAVE ROOM
            // ======================================

            sessionStorage.setItem(
                "meetingRoom",
                meetingCode
            );


            // ======================================
            // SAVE INVITE CODE
            // ======================================

            sessionStorage.setItem(
                "inviteCode",
                meetingCode
            );


            // ======================================
            // DISPLAY CODE
            // ======================================

            if (inviteCodeDisplay) {

                inviteCodeDisplay.textContent =
                    meetingCode;

            }


            // ======================================
            // STATUS
            // ======================================

            if (inviteStatus) {

                inviteStatus.textContent =
                    "Meeting created. Share this code with the interviewee.";

                inviteStatus.style.color =
                    "#16a34a";

            }


            // ======================================
            // SHOW MEETING SECTION
            // ======================================

            if (meetingSection) {

                meetingSection.style.display =
                    "block";

            }


            // ======================================
            // DISABLE CREATE BUTTON
            // ======================================

            createMeetingButton.disabled =
                true;


            // ======================================
            // SHOW OPEN MEETING BUTTON
            // ======================================

            if (openMeetingButton) {

                openMeetingButton.style.display =
                    "inline-block";

            }

        }
    );

}


// ==================================================
// COPY MEETING CODE
// ==================================================

if (copyCodeButton) {

    copyCodeButton.addEventListener(
        "click",
        async function () {

            if (!meetingCode) {

                return;

            }


            try {

                await navigator.clipboard.writeText(
                    meetingCode
                );


                copyCodeButton.textContent =
                    "Copied!";


                setTimeout(
                    function () {

                        copyCodeButton.textContent =
                            "Copy Code";

                    },
                    1500
                );

            }

            catch (error) {

                console.error(
                    "Could not copy meeting code:",
                    error
                );


                // Fallback

                const temporaryInput =
                    document.createElement(
                        "input"
                    );


                temporaryInput.value =
                    meetingCode;


                document.body.appendChild(
                    temporaryInput
                );


                temporaryInput.select();


                document.execCommand(
                    "copy"
                );


                temporaryInput.remove();


                copyCodeButton.textContent =
                    "Copied!";


                setTimeout(
                    function () {

                        copyCodeButton.textContent =
                            "Copy Code";

                    },
                    1500
                );

            }

        }
    );

}


// ==================================================
// OPEN MEETING ROOM
// ==================================================

if (openMeetingButton) {

    openMeetingButton.addEventListener(
        "click",
        function () {

            if (!meetingCode) {

                return;

            }


            // ======================================
            // Make sure role and room are saved
            // ======================================

            sessionStorage.setItem(
                "meetingRole",
                "interviewer"
            );


            sessionStorage.setItem(
                "meetingRoom",
                meetingCode
            );


            // ======================================
            // Open meeting.html
            // ======================================

            window.location.href =
                "meeting.html" +
                "?role=interviewer" +
                "&room=" +
                encodeURIComponent(
                    meetingCode
                );

        }
    );

}


// ==================================================
// DEBUG
// ==================================================

console.log(
    "======================================"
);

console.log(
    "interviewer.js loaded successfully."
);

console.log(
    "======================================"
);