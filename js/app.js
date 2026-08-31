import * as pdfjsLib
    from "../pdfjs/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "../pdfjs/pdf.worker.mjs";


// ==================================================
// PDF.JS WORKER
// ==================================================

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "./pdfjs/pdf.worker.mjs";


// ==================================================
// PYTHON BACKEND
// ==================================================

const API_URL =
    "http://127.0.0.1:8000";


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
// MEETING INFORMATION
// ==================================================

const meetingRole =
    sessionStorage.getItem(
        "meetingRole"
    );

const meetingRoom =
    sessionStorage.getItem(
        "meetingRoom"
    );


// ==================================================
// NEXT BUTTON
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


    // ==============================================
    // GET FILE EXTENSION
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
    // RESET UI
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
        // CLEAN TEXT
        // ==========================================

        extractedText =
            extractedText.trim();


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
        // DEBUG
        // ==========================================

        console.log(
            "Resume processed successfully."
        );

        console.log(
            "Filename:",
            file.name
        );

        console.log(
            "Extracted text length:",
            extractedText.length
        );


        // ==========================================
        // SAVE TO PYTHON DATABASE
        // ==========================================

        const savedResume =
            await saveResume(
                file,
                extractedText
            );


        console.log(
            "Resume saved to Python database:"
        );

        console.log(
            savedResume
        );


        // ==========================================
        // CREATE MEETING URL
        // ==========================================

        if (
            meetingRole &&
            meetingRoom &&
            savedResume.id
        ) {

            const meetingURL =
                "meeting.html" +
                "?role=" +
                encodeURIComponent(
                    meetingRole
                ) +
                "&room=" +
                encodeURIComponent(
                    meetingRoom
                ) +
                "&resumeId=" +
                encodeURIComponent(
                    savedResume.id
                );


            if (nextButton) {

                nextButton.href =
                    meetingURL;


                nextButton.style.display =
                    "block";

            }

        }

        else {

            console.log(
                "Resume saved, but meeting information is not available."
            );

        }

    }

    catch (error) {

        console.error(
            "Resume processing error:",
            error
        );


        alert(
            error.message ||
            "There was a problem processing the resume."
        );

    }

}


// ==================================================
// SAVE RESUME TO PYTHON
// ==================================================

async function saveResume(
    file,
    extractedText
) {

    // ==============================================
    // CREATE FORM DATA
    // ==============================================

    const formData =
        new FormData();


    // ==============================================
    // ORIGINAL FILE
    // ==============================================

    formData.append(
        "file",
        file
    );


    // ==============================================
    // EXTRACTED RESUME TEXT
    // ==============================================

    formData.append(
        "extracted_text",
        extractedText
    );


    // ==============================================
    // MEETING ROOM
    // ==============================================

    if (meetingRoom) {

        formData.append(
            "meeting_room",
            meetingRoom
        );

    }


    // ==============================================
    // MEETING ROLE
    // ==============================================

    if (meetingRole) {

        formData.append(
            "meeting_role",
            meetingRole
        );

    }


    // ==============================================
    // DEBUG
    // ==============================================

    console.log(
        "======================================"
    );

    console.log(
        "Uploading resume to Python API..."
    );

    console.log(
        "Filename:",
        file.name
    );

    console.log(
        "Extracted text length:",
        extractedText.length
    );

    console.log(
        "Meeting room:",
        meetingRoom
    );

    console.log(
        "Meeting role:",
        meetingRole
    );

    console.log(
        "======================================"
    );


    // ==============================================
    // SEND TO FASTAPI
    // ==============================================

    const response =
        await fetch(
            `${API_URL}/resumes`,
            {
                method: "POST",
                body: formData
            }
        );


    // ==============================================
    // CHECK RESPONSE
    // ==============================================

    if (!response.ok) {

        let message =
            "Could not save resume.";


        try {

            const error =
                await response.json();


            message =
                error.detail ||
                message;

        }

        catch {

            // Keep default error message.

        }


        throw new Error(
            message
        );

    }


    // ==============================================
    // READ PYTHON RESPONSE
    // ==============================================

    const result =
        await response.json();


    // ==============================================
    // DEBUG
    // ==============================================

    console.log(
        "Python API response:"
    );

    console.log(
        result
    );


    return result;

}


// ==================================================
// FILE INPUT
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


    // ==============================================
    // DRAG LEAVE
    // ==============================================

    uploadBox.addEventListener(
        "dragleave",
        function () {

            uploadBox.classList.remove(
                "drag-over"
            );

        }
    );


    // ==============================================
    // DROP
    // ==============================================

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
            // UPDATE FILE INPUT
            // ======================================

            const dataTransfer =
                new DataTransfer();


            dataTransfer.items.add(
                file
            );


            fileInput.files =
                dataTransfer.files;


            // ======================================
            // PROCESS
            // ======================================

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

    const arrayBuffer =
        await file.arrayBuffer();


    const pdf =
        await pdfjsLib
            .getDocument({
                data:
                    arrayBuffer
            })
            .promise;


    let fullText =
        "";


    // ==============================================
    // LOOP THROUGH EVERY PAGE
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
                    item =>
                        item.str
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

    if (
        typeof mammoth ===
        "undefined"
    ) {

        throw new Error(
            "Mammoth is not loaded. Make sure resume.html loads mammoth.browser.min.js."
        );

    }


    const arrayBuffer =
        await file.arrayBuffer();


    const result =
        await mammoth.extractRawText({
            arrayBuffer:
                arrayBuffer
        });


    return result.value.trim();

}
