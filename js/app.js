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
// CHECK MEETING INFORMATION
// ==================================================

if (
    !meetingRole ||
    !meetingRoom
) {

    console.warn(
        "Meeting information is missing."
    );

}


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

async function processResume(
    file
) {

    if (!file) {

        return;

    }


    // ==============================================
    // EXTENSION
    // ==============================================

    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    // ==============================================
    // FILE TYPE
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
    // RESET
    // ==============================================

    nextButton.style.display =
        "none";


    textContainer.style.display =
        "none";


    fileNameDiv.textContent =
        `Selected: ${file.name}`;


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


            pdfViewer.src =
                fileURL;


            previewContainer.style.display =
                "block";


            extractedText =
                await extractPDFText(
                    file
                );

        }


        // ==========================================
        // DOCX
        // ==========================================

        else {

            previewContainer.style.display =
                "none";


            extractedText =
                await extractDOCXText(
                    file
                );

        }


        // ==========================================
        // EXTRACTION FAILED
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
        // DISPLAY
        // ==========================================

        resumeText.value =
            extractedText;

        textContainer.style.display =
            "block";



        // ==========================================
        // SAVE
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

            meetingRoom:
                meetingRoom,

            meetingRole:
                meetingRole,

            uploadedAt:
                new Date().toISOString()
        };
        // ==========================================
        // SEND ORIGINAL RESUME TO SERVER
        // ==========================================

        if (
            !meetingRoom ||
            !meetingRole
        ) {
            throw new Error(
                "Meeting information is missing."
            );
        }

        const uploadURL =
            new URL(
                "/api/upload-resume",
                window.location.origin
            );

        uploadURL.searchParams.set(
            "room",
            meetingRoom
        );

        uploadURL.searchParams.set(
            "filename",
            file.name
        );

        const uploadResponse =
            await fetch(
                uploadURL,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/octet-stream"
                    },

                    body:
                        file
                }
            );

        const uploadResult =
            await uploadResponse.json();

        if (
            !uploadResponse.ok ||
            !uploadResult.success
        ) {

            throw new Error(
                uploadResult.message ||
                "Resume upload failed."
            );
        }

        resume.serverFileName =
            uploadResult.fileName;

        console.log(
            "Resume uploaded to server:",
            uploadResult.fileName
        );

        if (
            typeof savePDF ===
            "function"
        ) {

            await savePDF(
                resume
            );

        }
        else {

            console.warn(
                "savePDF() was not found."
            );

        }


        console.log(
            "Resume saved:",
            resume
        );


        // ==========================================
        // PREPARE MEETING URL
        // ==========================================

        if (
            meetingRole &&
            meetingRoom
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
                );


            nextButton.href =
                meetingURL;


            nextButton.style.display =
                "inline-block";

        }
        else {

            alert(
                "Resume processed, but meeting information is missing."
            );

        }

    }

    catch (error) {

        console.error(
            "Resume processing error:",
            error
        );


        alert(
            "There was a problem processing the resume."
        );

    }

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
        uploadBox.addEventListener(
        "click",
        function (event) {

            if (
                event.target.closest(
                    ".upload-button"
                )
            ) {
                return;
            }

            fileInput.click();
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


            const dataTransfer =
                new DataTransfer();


            dataTransfer.items.add(
                file
            );


            fileInput.files =
                dataTransfer.files;


            processResume(
                file
            );

        }
    );
}
// ==================================================
// EXTRACT PDF
// ==================================================

async function extractPDFText(
    file
) {

    const arrayBuffer =
        await file.arrayBuffer();


    const pdf =
        await pdfjsLib
            .getDocument({
                data:
                    arrayBuffer
            })
            .promise;


    let fullText = "";


    for (
        let pageNumber = 1;
        pageNumber <=
        pdf.numPages;
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
// EXTRACT DOCX
// ==================================================

async function extractDOCXText(
    file
) {

    if (
        typeof mammoth ===
        "undefined"
    ) {

        console.error(
            "Mammoth is not loaded."
        );

        return "";

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