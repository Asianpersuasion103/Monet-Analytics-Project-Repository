import * as pdfjsLib from "../pdfjs/pdf.mjs";


pdfjsLib.GlobalWorkerOptions.workerSrc =
    "../pdfjs/pdf.worker.mjs";


// ===============================
// HTML Elements
// ===============================

const fileInput =
    document.getElementById("pdf-input");


const fileNameDiv =
    document.getElementById("file-name");


const previewContainer =
    document.getElementById("preview-container");


const pdfViewer =
    document.getElementById("pdf-viewer");


const textContainer =
    document.getElementById("text-container");


const resumeText =
    document.getElementById("resume-text");


const uploadBox =
    document.getElementById("upload-box");


const nextButton =
    document.getElementById("next-button");


// ===============================
// Process Resume
// ===============================

async function processResume(file) {

    if (!file) {
        return;
    }


    // ===============================
    // Get File Extension
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
            "Please upload PDF or DOCX"
        );

        return;
    }


    // ===============================
    // Display File Name
    // ===============================

    fileNameDiv.textContent =
        `Selected: ${file.name}`;


    // ===============================
    // Hide Next Button
    // ===============================

    nextButton.style.display =
        "none";


    // ===============================
    // Create File Reader
    // ===============================

    const reader =
        new FileReader();


    // ===============================
    // Process File
    // ===============================

    reader.onload =
        async function () {

            try {

                const fileData =
                    reader.result;


                let extractedText = "";


                // ===============================
                // PDF Extraction
                // ===============================

                if (extension === "pdf") {

                    const fileURL =
                        URL.createObjectURL(file);


                    pdfViewer.src =
                        fileURL;


                    previewContainer.style.display =
                        "block";


                    extractedText =
                        await extractPDFText(
                            fileData
                        );

                }


                // ===============================
                // DOCX Extraction
                // ===============================

                else {

                    previewContainer.style.display =
                        "none";


                    extractedText =
                        await extractDOCXText(
                            fileData
                        );

                }


                // ===============================
                // Make Sure Text Was Extracted
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
                    "Saved Resume:"
                );


                console.log(resume);


                // ===============================
                // Display Extracted Text
                // ===============================

                resumeText.value =
                    extractedText;


                textContainer.style.display =
                    "block";


                // ===============================
                // Show Next Button
                // ===============================

                nextButton.style.display =
                    "block";

            }

            catch (error) {

                console.error(
                    "Error processing resume:",
                    error
                );


                alert(
                    "There was a problem processing the resume."
                );

            }

        };


    // ===============================
    // Read PDF
    // ===============================

    if (extension === "pdf") {

        reader.readAsDataURL(file);

    }


    // ===============================
    // Read DOCX
    // ===============================

    else {

        reader.readAsArrayBuffer(file);

    }

}


// ===============================
// Normal File Selection
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


        // ===============================
        // Put Dropped File Into
        // Normal File Input
        // ===============================

        const dataTransfer =
            new DataTransfer();


        dataTransfer.items.add(file);


        fileInput.files =
            dataTransfer.files;


        // ===============================
        // Process Dropped File
        // ===============================

        processResume(file);

    }
);


// ===============================
// Extract PDF Text
// ===============================

async function extractPDFText(dataURL) {

    const pdf =
        await pdfjsLib
            .getDocument({
                url: dataURL
            })
            .promise;


    let fullText = "";


    // ===============================
    // Loop Through Pages
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
                    item => item.str
                )
                .join(" ");


        fullText +=
            pageText + "\n";

    }


    return fullText;
}


// ===============================
// Extract DOCX Text
// ===============================

async function extractDOCXText(
    arrayBuffer
) {

    // ===============================
    // Check Mammoth
    // ===============================

    if (
        typeof mammoth ===
        "undefined"
    ) {

        console.error(
            "Mammoth is not loaded"
        );

        return "";

    }


    // ===============================
    // Extract Text
    // ===============================

    const result =
        await mammoth.extractRawText({

            arrayBuffer:
                arrayBuffer

        });


    return result.value;
}
