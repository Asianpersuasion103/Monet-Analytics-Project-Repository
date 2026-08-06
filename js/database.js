let db;

const request = indexedDB.open("ResumeDB", 1);

request.onupgradeneeded = (event) => {
    db = event.target.result;

    if (!db.objectStoreNames.contains("pdfs")) {
        db.createObjectStore("pdfs", { keyPath: "id" });
    }
};

request.onsuccess = (event) => {
    db = event.target.result;
    console.log("Database ready.");
};

request.onerror = (event) => {
    console.error(event.target.error);
};

function savePDF(record) {

    const tx = db.transaction(["pdfs"], "readwrite");

    tx.objectStore("pdfs").put(record);

    tx.oncomplete = () => {
        console.log("Saved.");
    };
}

function getPDF(id, callback) {

    const tx = db.transaction(["pdfs"], "readonly");

    const request = tx.objectStore("pdfs").get(id);

    request.onsuccess = () => {
        callback(request.result);
    };

    request.onerror = () => {
        console.error("Could not retrieve PDF.");
    };
} 

