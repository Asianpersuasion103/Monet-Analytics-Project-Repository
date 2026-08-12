import * as pdfjsLib
    from "../pdfjs/pdf.mjs";


// ===============================
// PDF.js Worker
// ===============================

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "../pdfjs/pdf.worker.mjs";


// ===============================
// HTML Elements
// ===============================

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


// ===============================
// Process Resume
// ===============================

async function processResume(file) {

    if (!file) {
        return;
    }


    // ===============================
    // File Extension
    // ===============================

    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    // ===============================
    // Check File Type
    // ===============================

    if (
        extension !== "pdf" &&
        extension !== "docx"
    ) {

        alert(
            "Please upload a PDF or DOCX file."
        );

        return;

    }


    // ===============================
    // Reset Page
    // ===============================

    nextButton.style.display =
        "none";

    textContainer.style.display =
        "none";


    fileNameDiv.textContent =
        `Selected: ${file.name}`;


    try {

        let extractedText = "";


        // ===============================
        // PDF
        // ===============================

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


        // ===============================
        // DOCX
        // ===============================

        else {

            previewContainer.style.display =
                "none";


            extractedText =
                await extractDOCXText(
                    file
                );

        }


        // ===============================
        // Check Extraction
        // ===============================

        if (
            !extractedText ||
            extractedText.trim() === ""
        ) {

            alert(
                "We could not extract any text from this resume."
            );

            return;

        }


        // ===============================
        // Display Text
        // ===============================

        resumeText.value =
            extractedText;


        textContainer.style.display =
            "block";


        // ===============================
        // Save Resume
        // ===============================

        const resume = {

            id:
                crypto.randomUUID(),

            fileName:
                file.name,

            fileType:
                extension,

            extractedText:
                extractedText

        };


        savePDF(resume);


        console.log(
            "Resume saved:",
            resume
        );


        // ===============================
        // Enable Next
        // ===============================

        nextButton.style.display =
            "block";


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


// ===============================
// File Selection
// ===============================

fileInput.addEventListener(
    "change",
    function (event) {

        const file =
            event.target.files[0];


        processResume(file);

    }
);


// ===============================
// Drag Over
// ===============================

uploadBox.addEventListener(
    "dragover",
    function (event) {

        event.preventDefault();

        uploadBox.classList.add(
            "drag-over"
        );

    }
);


// ===============================
// Drag Leave
// ===============================

uploadBox.addEventListener(
    "dragleave",
    function () {

        uploadBox.classList.remove(
            "drag-over"
        );

    }
);


// ===============================
// Drop
// ===============================

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


        processResume(file);

    }
);


// ===============================
// Extract PDF Text
// ===============================

async function extractPDFText(file) {

    const arrayBuffer =
        await file.arrayBuffer();


    const pdf =
        await pdfjsLib
            .getDocument({
                data: arrayBuffer
            })
            .promise;


    let fullText = "";


    // ===============================
    // Read Every Page
    // ===============================

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
            pageText + "\n";

    }


    return fullText.trim();

}


// ===============================
// Extract DOCX Text
// ===============================

async function extractDOCXText(file) {

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