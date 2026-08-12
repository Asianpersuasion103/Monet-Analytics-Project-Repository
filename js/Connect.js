"use strict";

document.addEventListener("DOMContentLoaded", function () {

    console.log("=================================");
    console.log("Connect.js loaded successfully.");
    console.log("=================================");


    // ==========================================
    // FIND INTERVIEWER BUTTON
    // ==========================================

    const interviewerButton =
        document.getElementById("interviewerButton");


    // ==========================================
    // FIND INTERVIEWEE BUTTON
    // ==========================================

    const intervieweeButton =
        document.getElementById("intervieweeButton");


    // ==========================================
    // CHECK INTERVIEWER BUTTON
    // ==========================================

    if (interviewerButton) {

        console.log(
            "Interviewer button found."
        );


        interviewerButton.addEventListener(
            "click",
            function () {

                console.log(
                    "Interviewer button clicked."
                );


                // interviewer.html is inside the htmls folder

                window.location.href =
                    "./htmls/interviewer.html";

            }
        );

    } else {

        console.error(
            "ERROR: interviewerButton not found."
        );

    }


    // ==========================================
    // CHECK INTERVIEWEE BUTTON
    // ==========================================

    if (intervieweeButton) {

        console.log(
            "Interviewee button found."
        );


        intervieweeButton.addEventListener(
            "click",
            function () {

                console.log(
                    "Interviewee button clicked."
                );


                // interviewee.html is inside the htmls folder

                window.location.href =
                    "./htmls/interviewee.html";

            }
        );

    } else {

        console.error(
            "ERROR: intervieweeButton not found."
        );

    }

});