"use strict";


// ==================================================
// PDF.JS
// ==================================================

import * as pdfjsLib
    from "../pdfjs/pdf.mjs";


// ==================================================
// PDF.JS WORKER
// ==================================================

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "../pdfjs/pdf.worker.mjs";


// ==================================================
// HTML ELEMENTS
// ==================================================

const fileInput =
    document.getElementById(
        "pdf-input"
    );


const fileNameDiv =
    document.getElementById(
        "file-name"
    );


const previewContainer =
    document.getElementById(
        "preview-container"
    );


const pdfViewer =
    document.getElementById(
        "pdf-viewer"
    );


const textContainer =
    document.getElementById(
        "text-container"
    );


const resumeText =
    document.getElementById(
        "resume-text"
    );


const uploadBox =
    document.getElementById(
        "upload-box"
    );


const nextButton =
    document.getElementById(
        "next-button"
    );


// ==================================================
// CHECK HTML ELEMENTS
// ==================================================

console.log(
    "======================================"
);

console.log(
    "Resume app.js loaded."
);

console.log(
    "======================================"
);


if (!fileInput) {

    console.error(
        "ERROR: #pdf-input was not found."
    );

}


if (!uploadBox) {

    console.error(
        "ERROR: #upload-box was not found."
    );

}


if (!nextButton) {

    console.error(
        "ERROR: #next-button was not found."
    );

}


// ==================================================
// MEETING INFORMATION
// ==================================================
//
// interviewee.js saves these values when the
// interviewee successfully enters the invite code.
//
// ==================================================

const meetingRole =
    sessionStorage.getItem(
        "meetingRole"
    ) || "interviewee";


const meetingRoom =
    sessionStorage.getItem(
        "meetingRoom"
    );


console.log(
    "Meeting role:",
    meetingRole
);


console.log(
    "Meeting room:",
    meetingRoom
);


// ==================================================
// INITIAL NEXT BUTTON STATE
// ==================================================
//
// The interviewee should NOT be able to continue
// until a valid resume has been processed.
// ==================================================

if (nextButton) {

    nextButton.style.display =
        "none";

}


// ==================================================
// PROCESS RESUME
// ==================================================

async function processResume(file) {

    if (!file) {

        return;

    }


    console.log(
        "Processing resume:",
        file.name
    );


    // ==============================================
    // FILE EXTENSION
    // ==============================================

    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    // ==============================================
    // CHECK FILE TYPE
    // ==============================================

    if (
        extension !== "pdf" &&
        extension !== "docx"
    ) {

        alert(
            "Please upload a PDF or DOCX file."
        );

        return;

    }


    // ==============================================
    // RESET DISPLAY
    // ==============================================

    if (nextButton) {

        nextButton.style.display =
            "none";

    }


    if (textContainer) {

        textContainer.style.display =
            "none";

    }


    if (previewContainer) {

        previewContainer.style.display =
            "none";

    }


    if (resumeText) {

        resumeText.value =
            "";

    }


    if (fileNameDiv) {

        fileNameDiv.textContent =
            `Selected: ${file.name}`;

    }


    try {

        let extractedText = "";


        // ==========================================
        // PDF
        // ==========================================

        if (
            extension === "pdf"
        ) {

            const fileURL =
                URL.createObjectURL(
                    file
                );


            if (pdfViewer) {

                pdfViewer.src =
                    fileURL;

            }


            if (previewContainer) {

                previewContainer.style.display =
                    "block";

            }


            extractedText =
                await extractPDFText(
                    file
                );

        }


        // ==========================================
        // DOCX
        // ==========================================

        else {

            extractedText =
                await extractDOCXText(
                    file
                );

        }


        // ==========================================
        // CHECK EXTRACTED TEXT
        // ==========================================

        if (
            !extractedText ||
            extractedText.trim() === ""
        ) {

            alert(
                "We could not extract any text from this resume."
            );

            return;

        }


        // ==========================================
        // DISPLAY EXTRACTED TEXT
        // ==========================================

        if (resumeText) {

            resumeText.value =
                extractedText;

        }


        if (textContainer) {

            textContainer.style.display =
                "block";

        }


        // ==========================================
        // SAVE RESUME
        // ==========================================

        const resume = {

            id:
                crypto.randomUUID(),

            fileName:
                file.name,

            fileType:
                extension,

            extractedText:
                extractedText,

            meetingRole:
                meetingRole,

            meetingRoom:
                meetingRoom

        };


        // ==========================================
        // SAVE TO INDEXED DB
        // ==========================================

        if (
            typeof savePDF ===
            "function"
        ) {

            await savePDF(
                resume
            );


            console.log(
                "Resume saved successfully:",
                resume
            );

        }

        else {

            console.warn(
                "savePDF() is not available. Check database.js."
            );

        }


        // ==========================================
        // PREPARE MEETING URL
        // ==========================================

        prepareMeetingURL();


        // ==========================================
        // SHOW NEXT BUTTON
        // ==========================================

        if (nextButton) {

            nextButton.style.display =
                "inline-block";

        }


        console.log(
            "Resume processing completed successfully."
        );

    }

    catch (error) {

        console.error(
            "======================================"
        );

        console.error(
            "Resume processing error:"
        );

        console.error(
            error
        );

        console.error(
            "======================================"
        );


        alert(
            "There was a problem processing the resume. Please check the browser console for details."
        );

    }

}


// ==================================================
// PREPARE MEETING URL
// ==================================================

function prepareMeetingURL() {

    if (!nextButton) {

        return;

    }


    // ==============================================
    // Get latest room information
    // ==============================================

    const role =
        sessionStorage.getItem(
            "meetingRole"
        ) || "interviewee";


    const room =
        sessionStorage.getItem(
            "meetingRoom"
        );


    // ==============================================
    // If there is no room, don't create a broken URL
    // ==============================================

    if (!room) {

        console.warn(
            "No meeting room found in sessionStorage."
        );


        nextButton.href =
            "meeting.html";


        return;

    }


    // ==============================================
    // Create meeting URL
    // ==============================================

    const meetingURL =
        "meeting.html" +
        "?role=" +
        encodeURIComponent(
            role
        ) +
        "&room=" +
        encodeURIComponent(
            room
        );


    // ==============================================
    // Set Next button
    // ==============================================

    nextButton.href =
        meetingURL;


    console.log(
        "Meeting URL prepared:",
        meetingURL
    );

}


// ==================================================
// FILE SELECTION
// ==================================================

if (fileInput) {

    fileInput.addEventListener(
        "change",
        function (event) {

            const file =
                event.target.files[0];


            processResume(
                file
            );

        }
    );

}


// ==================================================
// DRAG OVER
// ==================================================

if (uploadBox) {

    uploadBox.addEventListener(
        "dragover",
        function (event) {

            event.preventDefault();


            uploadBox.classList.add(
                "drag-over"
            );

        }
    );

}


// ==================================================
// DRAG LEAVE
// ==================================================

if (uploadBox) {

    uploadBox.addEventListener(
        "dragleave",
        function () {

            uploadBox.classList.remove(
                "drag-over"
            );

        }
    );

}


// ==================================================
// DROP
// ==================================================

if (uploadBox) {

    uploadBox.addEventListener(
        "drop",
        function (event) {

            event.preventDefault();


            uploadBox.classList.remove(
                "drag-over"
            );


            const file =
                event.dataTransfer.files[0];


            if (!file) {

                return;

            }


            // ======================================
            // Put dropped file into file input
            // ======================================

            try {

                const dataTransfer =
                    new DataTransfer();


                dataTransfer.items.add(
                    file
                );


                fileInput.files =
                    dataTransfer.files;

            }

            catch (error) {

                console.warn(
                    "Could not update file input:",
                    error
                );

            }


            processResume(
                file
            );

        }
    );

}


// ==================================================
// EXTRACT PDF TEXT
// ==================================================

async function extractPDFText(file) {

    console.log(
        "Extracting PDF text..."
    );


    const arrayBuffer =
        await file.arrayBuffer();


    const pdf =
        await pdfjsLib
            .getDocument({
                data:
                    arrayBuffer
            })
            .promise;


    console.log(
        "PDF pages:",
        pdf.numPages
    );


    let fullText =
        "";


    // ==============================================
    // READ EVERY PAGE
    // ==============================================

    for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
    ) {

        const page =
            await pdf.getPage(
                pageNumber
            );


        const content =
            await page.getTextContent();


        const pageText =
            content.items
                .map(
                    function (item) {

                        return item.str;

                    }
                )
                .join(" ");


        fullText +=
            pageText +
            "\n";

    }


    return fullText.trim();

}


// ==================================================
// EXTRACT DOCX TEXT
// ==================================================

async function extractDOCXText(file) {

    console.log(
        "Extracting DOCX text..."
    );


    // ==============================================
    // Check Mammoth
    // ==============================================

    if (
        typeof mammoth ===
        "undefined"
    ) {

        console.error(
            "Mammoth is not loaded."
        );


        alert(
            "DOCX parsing is unavailable because Mammoth did not load."
        );


        return "";

    }


    // ==============================================
    // Read file
    // ==============================================

    const arrayBuffer =
        await file.arrayBuffer();


    // ==============================================
    // Extract text
    // ==============================================

    const result =
        await mammoth.extractRawText({

            arrayBuffer:
                arrayBuffer

        });


    return result.value.trim();

}


// ==================================================
// INITIALIZE
// ==================================================

prepareMeetingURL();