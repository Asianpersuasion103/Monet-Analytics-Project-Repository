"use strict";


// ===============================
// Database Configuration
// ===============================

const DB_NAME = "ResumeDB";

const DB_VERSION = 1;

const STORE_NAME = "pdfs";

let db = null;


// ===============================
// Open Database
// ===============================

const request = indexedDB.open(
    DB_NAME,
    DB_VERSION
);


// ===============================
// Create Database
// ===============================

request.onupgradeneeded = function (event) {

    db = event.target.result;


    if (
        !db.objectStoreNames.contains(
            STORE_NAME
        )
    ) {

        db.createObjectStore(
            STORE_NAME,
            {
                keyPath: "id"
            }
        );

    }

};


// ===============================
// Database Ready
// ===============================

request.onsuccess = function (event) {

    db = event.target.result;

    console.log(
        "Resume database ready."
    );

};


// ===============================
// Database Error
// ===============================

request.onerror = function (event) {

    console.error(
        "IndexedDB error:",
        event.target.error
    );

};


// ===============================
// Save Resume
// ===============================

function savePDF(record) {

    if (!db) {

        console.error(
            "Database is not ready."
        );

        return;

    }


    const transaction =
        db.transaction(
            [STORE_NAME],
            "readwrite"
        );


    const store =
        transaction.objectStore(
            STORE_NAME
        );


    store.put(record);


    transaction.oncomplete =
        function () {

            console.log(
                "Resume saved."
            );

        };


    transaction.onerror =
        function (event) {

            console.error(
                "Could not save resume:",
                event.target.error
            );

        };

}


// ===============================
// Get Resume
// ===============================

function getPDF(
    id,
    callback
) {

    if (!db) {

        console.error(
            "Database is not ready."
        );

        return;

    }


    const transaction =
        db.transaction(
            [STORE_NAME],
            "readonly"
        );


    const store =
        transaction.objectStore(
            STORE_NAME
        );


    const request =
        store.get(id);


    request.onsuccess =
        function () {

            callback(
                request.result
            );

        };


    request.onerror =
        function (event) {

            console.error(
                "Could not retrieve resume:",
                event.target.error
            );

        };

}