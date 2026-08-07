import * as pdfjsLib from "../pdfjs/pdf.mjs";


pdfjsLib.GlobalWorkerOptions.workerSrc =
    "../pdfjs/pdf.worker.mjs";



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





// =====================================
// Upload Handler
// =====================================


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





    if(extension !== "pdf" && extension !== "docx"){


        alert(
            "Only PDF and DOCX files are supported."
        );


        return;

    }





    fileNameDiv.textContent =
        `Selected: ${file.name}`;





    const reader =
        new FileReader();





    reader.onload = async function(){



        const fileData =
            reader.result;





        // Save resume

        const resume = {


            id:"resume",


            name:file.name,


            type:file.type,


            data:fileData


        };



        savePDF(resume);







        let extractedText = "";







        // =============================
        // PDF
        // =============================


        if(extension === "pdf"){



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






        // =============================
        // DOCX
        // =============================


        else {



            previewContainer.style.display =
                "none";



            extractedText =
                await extractDOCXText(
                    fileData
                );


        }





        // Display text

        resumeText.value =
            extractedText;



        textContainer.style.display =
            "block";





        console.log(
            "Extracted Text:"
        );


        console.log(
            extractedText
        );




    };







    // PDF reading

    if(extension === "pdf"){



        reader.readAsDataURL(file);



    }




    // DOCX reading

    else {



        reader.readAsArrayBuffer(file);



    }





});









// =====================================
// PDF Text Extraction
// =====================================


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









// =====================================
// DOCX Text Extraction
// =====================================


async function extractDOCXText(arrayBuffer){



    if(typeof mammoth === "undefined"){



        console.error(
            "Mammoth not loaded"
        );



        return "Unable to read DOCX file.";

    }






    const result =
        await mammoth
        .extractRawText({

            arrayBuffer:arrayBuffer

        });






    return result.value;



}