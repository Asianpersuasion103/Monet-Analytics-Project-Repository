import * as pdfjsLib from "../pdfjs/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
    "../pdfjs/pdf.worker.mjs";


const pdfInput = document.getElementById("pdf-input");
const fileNameDiv = document.getElementById("file-name");
const previewContainer = document.getElementById("preview-container");
const pdfViewer = document.getElementById("pdf-viewer");


// When user selects a PDF
pdfInput.addEventListener("change", function(event) {

    const file = event.target.files[0];


    if (!file || file.type !== "application/pdf") {

        alert("Please select a valid PDF file.");
        fileNameDiv.textContent = "No file selected";
        previewContainer.style.display = "none";

        return;
    }


    fileNameDiv.textContent = `Selected: ${file.name}`;


    // Show PDF preview
    const fileURL = URL.createObjectURL(file);

    pdfViewer.src = fileURL;
    previewContainer.style.display = "block";


    // Read PDF for storage + extraction
    const reader = new FileReader();


    reader.onload = async function() {

        const pdfData = reader.result;


        // Object stored in IndexedDB
        const resume = {

            id: "resume",

            name: file.name,

            type: file.type,

            data: pdfData
        };


        // Save PDF
        savePDF(resume);


        console.log("Stored PDF object:");
        console.log(resume);


        // Extract resume text
        const text = await extractText(pdfData);


        console.log("Extracted Resume Text:");
        console.log(text);

    };


    // Convert PDF into data URL
    reader.readAsDataURL(file);

});



// PDF.js text extraction
async function extractText(dataURL) {


    const pdf = await pdfjsLib.getDocument({

        url: dataURL

    }).promise;


    console.log("Number of pages:", pdf.numPages);


    let fullText = "";


    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {


        const page = await pdf.getPage(pageNum);


        const content = await page.getTextContent();


        console.log(`Page ${pageNum} objects:`);
        console.log(content.items);


        const pageText = content.items

            .map(item => item.str)

            .join(" ");


        fullText += pageText + "\n";

    }


    return fullText;
}