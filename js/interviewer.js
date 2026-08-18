"use strict";


// ==================================================
// CONFIGURATION
// ==================================================

const SERVER_URL =
    "http://localhost:8080";


// ==================================================
// HTML ELEMENTS
// ==================================================

const backButton =
    document.getElementById(
        "backButton"
    );


if (backButton) {

    backButton.addEventListener(
        "click",
        function () {

            window.history.back();

        }
    );

}


const generateCodeButton =
    document.getElementById(
        "generateCodeButton"
    );


const copyCodeButton =
    document.getElementById(
        "copyCodeButton"
    );


const inviteCodeElement =
    document.getElementById(
        "inviteCode"
    );


const meetingLink =
    document.getElementById(
        "meetingLink"
    );


const statusElement =
    document.getElementById(
        "status"
    );


const expirationElement =
    document.getElementById(
        "expiration"
    );

const applicantEmailInput =
    document.getElementById("applicantEmail");

// ==================================================
// CURRENT MEETING
// ==================================================

let currentInviteCode =
    null;


// ==================================================
// GENERATE MEETING CODE
// ==================================================

generateCodeButton.addEventListener(
    "click",
    async function () {
        const applicantEmail = applicantEmailInput.value.trim();
        if(!applicantEmail){
            statusElement.textContent = 
            "Please enter the applicant's email."; 
            statusElement.className = "error";
            applicantEmailInput.focus();
            return;
        }
        if(!applicantEmailInput.checkValidity()){
            statusElement.textContent =
            "Please enter a valid email address."; 
            statusElement.className = "error";
            applicantEmailInput.focus(); 
            return; 
        }
        console.log(
            "Generate Meeting Code clicked."
        );


        // ==========================================
        // RESET UI
        // ==========================================

        generateCodeButton.disabled =
            true;


        copyCodeButton.disabled =
            true;


        meetingLink.style.display =
            "none";


        expirationElement.style.display =
            "none";


        inviteCodeElement.textContent =
            "Generating...";


        statusElement.textContent =
            "Connecting to meeting server...";


        statusElement.className =
            "";


        try {

            // ======================================
            // ASK SERVER TO CREATE ROOM
            // ======================================

            const response =
                await fetch(
                    `${SERVER_URL}/api/create-room`,
                    {
                        method:
                            "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        }, 
                        body: JSON.stringify({
                            applicantEmail: applicantEmail
                        })
                    }
                );


            console.log(
                "Server response:",
                response.status
            );


            // ======================================
            // CHECK HTTP RESPONSE
            // ======================================

            if (
                !response.ok
            ) {

                throw new Error(
                    `Server returned HTTP ${response.status}`
                );

            }


            // ======================================
            // READ JSON
            // ======================================

            const data =
                await response.json();
            
                if (!response.ok){
                    throw new Error(
                        data.message || `Server returned HTTP ${response.status}`
                    );
                }


            console.log(
                "Create room response:",
                data
            );


            // ======================================
            // VALIDATE RESPONSE
            // ======================================

            if (
                !data.success
                ||
                !data.inviteCode
            ) {

                throw new Error(
                    "The server did not return a meeting code."
                );

            }


            // ======================================
            // GET RANDOM CODE
            // ======================================

            currentInviteCode =
                String(
                    data.inviteCode
                )
                .trim()
                .toUpperCase();


            // ======================================
            // DISPLAY CODE
            // ======================================

            inviteCodeElement.textContent =
                currentInviteCode;


            // ======================================
            // SAVE MEETING INFORMATION
            // ======================================

            sessionStorage.setItem(
                "meetingRole",
                "interviewer"
            );


            sessionStorage.setItem(
                "meetingRoom",
                currentInviteCode
            );


            sessionStorage.setItem(
                "inviteCode",
                currentInviteCode
            );


            // ======================================
            // CREATE MEETING PAGE LINK
            // ======================================

            const meetingURL =
                "meeting.html" +
                "?role=interviewer" +
                "&room=" +
                encodeURIComponent(
                    currentInviteCode
                );


            meetingLink.href =
                meetingURL;


            meetingLink.style.display =
                "inline-block";


            // ======================================
            // ENABLE COPY
            // ======================================

            copyCodeButton.disabled =
                false;


            // ======================================
            // EXPIRATION
            // ======================================

            expirationElement.style.display =
                "block";


            // ======================================
            // STATUS
            // ======================================

            statusElement.textContent =
                "Meeting code created. Give this code to the interviewee.";


            statusElement.className =
                "success";


            // ======================================
            // CHANGE BUTTON
            // ======================================

            generateCodeButton.textContent =
                "Generate New Meeting";


        }

        catch (error) {

            console.error(
                "Meeting code generation failed:",
                error
            );


            // ======================================
            // RESET CODE
            // ======================================

            currentInviteCode =
                null;


            inviteCodeElement.textContent =
                "----";


            copyCodeButton.disabled =
                true;


            meetingLink.style.display =
                "none";


            expirationElement.style.display =
                "none";


            // ======================================
            // ERROR MESSAGE
            // ======================================

            statusElement.textContent =
                "Could not connect to the meeting server. Make sure server.js is running on port 8080.";


            statusElement.className =
                "error";

        }

        finally {

            generateCodeButton.disabled =
                false;

        }

    }
);


// ==================================================
// COPY MEETING CODE
// ==================================================

copyCodeButton.addEventListener(
    "click",
    async function () {

        if (
            !currentInviteCode
        ) {

            return;

        }


        try {

            await navigator.clipboard.writeText(
                currentInviteCode
            );


            statusElement.textContent =
                "Meeting code copied to clipboard.";


            statusElement.className =
                "success";

        }

        catch (error) {

            console.error(
                "Could not copy code:",
                error
            );


            // ======================================
            // FALLBACK
            // ======================================

            try {

                const temporaryInput =
                    document.createElement(
                        "textarea"
                    );


                temporaryInput.value =
                    currentInviteCode;


                document.body.appendChild(
                    temporaryInput
                );


                temporaryInput.select();


                document.execCommand(
                    "copy"
                );


                temporaryInput.remove();


                statusElement.textContent =
                    "Meeting code copied.";


                statusElement.className =
                    "success";

            }

            catch (fallbackError) {

                console.error(
                    "Copy fallback failed:",
                    fallbackError
                );


                statusElement.textContent =
                    "Could not copy the code. Please copy it manually.";

                statusElement.className =
                    "error";

            }

        }

    }
);


// ==================================================
// PAGE LOAD
// ==================================================

console.log(
    "======================================"
);

console.log(
    "Interviewer page loaded."
);

console.log(
    "Server:",
    SERVER_URL
);

console.log(
    "Waiting for meeting-code generation."
);

console.log(
    "======================================"
);