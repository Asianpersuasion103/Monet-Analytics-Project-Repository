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




// ===============================
// Upload Resume
// ===============================

fileInput.addEventListener(
"change",
function(event){


    const file =
    event.target.files[0];


    if(!file){

        return;

    }




    const extension =
    file.name
    .split(".")
    .pop()
    .toLowerCase();





    if(
        extension !== "pdf" &&
        extension !== "docx"
    ){

        alert(
            "Please upload PDF or DOCX"
        );

        return;

    }





    fileNameDiv.textContent =
    `Selected: ${file.name}`;





    const reader =
    new FileReader();





    reader.onload =
    async function(){


        const fileData =
        reader.result;



        let extractedText = "";







        // ===============================
        // PDF Extraction
        // ===============================

        if(extension === "pdf"){



            const fileURL =
            URL.createObjectURL(file);



            pdfViewer.src =
            fileURL;



            previewContainer.style.display =
            "block";



            extractedText =
            await extractPDFText(fileData);


        }







        // ===============================
        // DOCX Extraction
        // ===============================

        else{


            previewContainer.style.display =
            "none";



            extractedText =
            await extractDOCXText(fileData);


        }








        // ===============================
        // Save Resume JSON Object
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
        // Display ONLY extracted text
        // ===============================


        resumeText.value =
        extractedText;



        textContainer.style.display =
        "block";



    };








    // PDF uses Data URL

    if(extension === "pdf"){


        reader.readAsDataURL(file);


    }



    // DOCX uses ArrayBuffer

    else{


        reader.readAsArrayBuffer(file);


    }



});









// ===============================
// Extract PDF Text
// ===============================

async function extractPDFText(dataURL){


    const pdf =
    await pdfjsLib
    .getDocument({

        url:dataURL

    })
    .promise;




    let fullText = "";





    for(
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
    ){



        const page =
        await pdf.getPage(pageNumber);





        const content =
        await page.getTextContent();





        const pageText =
        content.items
        .map(item => item.str)
        .join(" ");





        fullText +=
        pageText + "\n";



    }





    return fullText;


}









// ===============================
// Extract DOCX Text
// ===============================

async function extractDOCXText(arrayBuffer){



    if(typeof mammoth === "undefined"){


        console.error(
            "Mammoth is not loaded"
        );


        return "";

    }





    const result =
    await mammoth.extractRawText({

        arrayBuffer:arrayBuffer

    });





    return result.value;


}