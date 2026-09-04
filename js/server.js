"use strict";

require("dotenv").config(); 

// ==================================================
// IMPORTS
// ==================================================
const fs = require ("fs");
const path = require ("path");

const http =
    require("http");

const crypto =
    require("crypto");

const WebSocket =
    require("ws");

 const { MongoClient } =
    require("mongodb");   

const {
    sendInterviewInvitation
} = require("./email.js"); 

// READ JSON REQUEST BODY 
function readJSONBody(request) {
    return new Promise((resolve, reject) => {
        let body = "";

        request.on("data", (chunk) => {
            body += chunk.toString();

            if (body.length > 100000) {
                reject(
                    new Error("Request body too large.")
                );

                request.destroy();
            }
        });

        request.on("end", () => {
            try {
                const parsedBody =
                    JSON.parse(body || "{}");

                resolve(parsedBody);
            } catch (error) {
                reject(
                    new Error("Invalid JSON.")
                );
            }
        });

        request.on("error", (error) => {
            reject(error);
        });
    });
}

// ==================================================
// READ BINARY FILE BODY
// ==================================================

function readBinaryBody(
    request,
    maxBytes = 10 * 1024 * 1024
) {
    return new Promise(
        (resolve, reject) => {

            const chunks = [];
            let totalBytes = 0;
            let rejected = false;

            request.on(
                "data",
                function (chunk) {

                    if (rejected) {
                        return;
                    }

                    totalBytes += chunk.length;

                    if (totalBytes > maxBytes) {

                        rejected = true;

                        reject(
                            new Error(
                                "Resume is too large. Maximum size is 10 MB."
                            )
                        );

                        return;
                    }

                    chunks.push(chunk);
                }
            );

            request.on(
                "end",
                function () {

                    if (rejected) {
                        return;
                    }

                    resolve(
                        Buffer.concat(chunks)
                    );
                }
            );

            request.on(
                "error",
                reject
            );
        }
    );
}
// ==================================================
// CONFIGURATION
// ==================================================


//
// MONGO STUFF 
// 
const PORT = 8080; 

const MONGODB_URI =
    "mongodb://127.0.0.1:27017";

const MONGODB_DATABASE =
    "ResumeDB";

let mongoClient;
let mongoDB;


//
//MONGO CONNECTION FUNCTION 
// 

async function connectToMongoDB() {

    mongoClient =
        new MongoClient(
            MONGODB_URI
        );

    await mongoClient.connect();

    mongoDB =
        mongoClient.db(
            MONGODB_DATABASE
        );

    console.log(
        "MongoDB connected."
    );

}


// ==================================================
// MEETING ROOMS
// ==================================================

const meetingRooms =
    new Map();


// ==================================================
// INVITE CODE EXPIRATION
// ==================================================

const INVITE_CODE_LIFETIME =
    30 * 60 * 1000;


// ==================================================
// GENERATE RANDOM INVITE CODE
// ==================================================

function generateInviteCode() {

    const characters =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let firstPart = "";
    let secondPart = "";


    for (
        let i = 0;
        i < 4;
        i++
    ) {

        firstPart +=
            characters[
                crypto.randomInt(
                    0,
                    characters.length
                )
            ];

    }


    for (
        let i = 0;
        i < 4;
        i++
    ) {

        secondPart +=
            characters[
                crypto.randomInt(
                    0,
                    characters.length
                )
            ];

    }


    return (
        firstPart +
        "-" +
        secondPart
    );

}


// ==================================================
// CREATE ROOM
// ==================================================

function createMeetingRoom(applicantEmail) {
    let inviteCode;

    do {

        inviteCode =
            generateInviteCode();

    }
    while (
        meetingRooms.has(
            inviteCode
        )
    );


    const now =
        Date.now();


    const room = {

        inviteCode:
            inviteCode,
        
        applicantEmail: applicantEmail, 

        createdAt:
            now,

        expiresAt:
            now +
            INVITE_CODE_LIFETIME,

        interviewer:
            null,

        interviewee:
            null

    };


    meetingRooms.set(
        inviteCode,
        room
    );


    console.log(
        "Created meeting room:",
        inviteCode
    );


    return room;

}


// ==================================================
// GET VALID ROOM
// ==================================================

function getValidRoom(
    inviteCode
) {

    if (!inviteCode) {

        return null;

    }


    const room =
        meetingRooms.get(
            inviteCode
        );


    if (!room) {

        return null;

    }


    if (
        Date.now() >
        room.expiresAt
    ) {

        meetingRooms.delete(
            inviteCode
        );


        console.log(
            "Expired room:",
            inviteCode
        );


        return null;

    }


    return room;

}


// ==================================================
// SEND JSON
// ==================================================

function sendJSON(
    response,
    statusCode,
    data
) {

    response.writeHead(
        statusCode,
        {
            "Content-Type":
                "application/json",

            "Access-Control-Allow-Origin":
                "*",

            "Access-Control-Allow-Headers":
                "Content-Type",

            "Access-Control-Allow-Methods":
                "GET,POST,OPTIONS"
        }
    );


    response.end(
        JSON.stringify(
            data
        )
    );
}


// ==================================================
// HTTP SERVER
// ==================================================

function serveStaticFile(request, response) {
    const projectRoot =
        path.resolve(__dirname, "..");

    const requestPath =
        request.url.split("?")[0];

    const filePath =
        path.resolve(
            projectRoot,
            "." + requestPath
        );

    // Prevent requests from escaping the project folder.
    if (!filePath.startsWith(projectRoot)) {
        return false;
    }

    if (
        !fs.existsSync(filePath) ||
        !fs.statSync(filePath).isFile()
    ) {
        return false;
    }

    const extension =
        path.extname(filePath).toLowerCase();

    const contentTypes = {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".mjs": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".svg": "image/svg+xml"
    };

    response.writeHead(
        200,
        {
            "Content-Type":
                contentTypes[extension] ||
                "application/octet-stream"
        }
    );

    fs.createReadStream(filePath)
        .pipe(response);

    return true;
}
const server =
    http.createServer(
        async function (
            request,
            response
        ) {


            // ======================================
            // CORS
            // ======================================

            if (
                request.method ===
                "OPTIONS"
            ) {

                response.writeHead(
                    204,
                    {
                        "Access-Control-Allow-Origin":
                            "*",

                        "Access-Control-Allow-Headers":
                            "Content-Type",

                        "Access-Control-Allow-Methods":
                            "GET,POST,OPTIONS"
                    }
                );


                response.end();

                return;

            }


            // ======================================
            // CREATE ROOM
            // ======================================

            if (
                request.method ===
                    "POST" &&
                request.url ===
                    "/api/create-room"
            ) {
            try {
                const body = await readJSONBody(request); 
                const applicantEmail = 
                    String(
                        body.applicantEmail || ""
                    )
                        .trim()
                        .toLowerCase();
                if (!applicantEmail) {
                    sendJSON(
                        response, 400,  {
                            success: false,
                            message: "Applicant email is required."
                        }
                    ); 
                    return; 
                }
                const room = createMeetingRoom(
                    applicantEmail
                ); 
                try {
                    await sendInterviewInvitation(
                        applicantEmail, 
                        room.inviteCode
                    ); 
                } catch (emailError) {
                    meetingRooms.delete(room.inviteCode); 
                    throw emailError; 
                }
                console.log(
                    "Invitation sent:",
                    applicantEmail,
                    room.inviteCode
                ); 

                sendJSON(
                    response,
                    200,
                    {
                        success: true,
                        inviteCode: room.inviteCode,
                        room: room.inviteCode,
                        expiresAt: room.expiresAt, 
                        invitationSent: true
                    }
                );
            } catch (error) {
                console.error(
                    "Create room error:", 
                    error
                ); 
                sendJSON(
                    response, 
                    500,
                    {
                        success: false,
                        message: "Could not create and send the interview invitation."
                    }
                );
            }
            return; 
        }

            // ======================================
            // VERIFY INVITE
            // ======================================

            if (
                request.method ===
                    "POST" &&
                request.url ===
                    "/api/verify-invite"
            ) {

                let body = "";


                request.on(
                    "data",
                    function (chunk) {

                        body +=
                            chunk.toString();

                    }
                );


                request.on(
                    "end",
                    function () {

                        try {

                            const data =
                                JSON.parse(
                                    body
                                );


                            const inviteCode =
                                String(
                                    data.inviteCode ||
                                    ""
                                )
                                .trim()
                                .toUpperCase();


                            const room =
                                getValidRoom(
                                    inviteCode
                                );


                            if (!room) {

                                sendJSON(
                                    response,
                                    404,
                                    {
                                        valid:
                                            false,

                                        message:
                                            "Invalid or expired invite code."
                                    }
                                );

                                return;

                            }


                            if (
                                room.interviewee
                            ) {

                                sendJSON(
                                    response,
                                    409,
                                    {
                                        valid:
                                            false,

                                        message:
                                            "This meeting already has an interviewee."
                                    }
                                );

                                return;

                            }


                            sendJSON(
                                response,
                                200,
                                {
                                    valid:
                                        true,

                                    room:
                                        room.inviteCode,

                                    expiresAt:
                                        room.expiresAt
                                }
                            );

                        }

                        catch (error) {

                            console.error(
                                "Invite verification error:",
                                error
                            );


                            sendJSON(
                                response,
                                400,
                                {
                                    valid:
                                        false,

                                    message:
                                        "Invalid request."
                                }
                            );

                        }

                    }
                );


                return;

            }
            // ======================================
// UPLOAD RESUME
// ======================================

if (
    request.method === "POST" &&
    request.url.startsWith(
        "/api/upload-resume"
    )
) {

    try {

        const uploadURL =
            new URL(
                request.url,
                `http://localhost:${PORT}`
            );

        const roomCode =
            String(
                uploadURL.searchParams.get(
                    "room"
                ) || ""
            )
            .trim()
            .toUpperCase();

        const originalFileName =
            path.basename(
                uploadURL.searchParams.get(
                    "filename"
                ) || ""
            );

        // ------------------------------
        // Validate meeting
        // ------------------------------

        const room =
            getValidRoom(
                roomCode
            );

        if (!room) {

            sendJSON(
                response,
                400,
                {
                    success: false,
                    message:
                        "Invalid or expired meeting room."
                }
            );

            return;
        }

        // ------------------------------
        // Validate filename
        // ------------------------------

        if (!originalFileName) {

            sendJSON(
                response,
                400,
                {
                    success: false,
                    message:
                        "Resume filename is missing."
                }
            );

            return;
        }

        const extension =
            path.extname(
                originalFileName
            )
            .toLowerCase();

        if (
            extension !== ".pdf" &&
            extension !== ".docx"
        ) {

            sendJSON(
                response,
                400,
                {
                    success: false,
                    message:
                        "Only PDF and DOCX resumes are allowed."
                }
            );

            return;
        }

        // ------------------------------
        // Read file
        // ------------------------------

        const fileBuffer =
            await readBinaryBody(
                request
            );

        if (
            !fileBuffer ||
            fileBuffer.length === 0
        ) {

            sendJSON(
                response,
                400,
                {
                    success: false,
                    message:
                        "The uploaded resume is empty."
                }
            );

            return;
        }

        // ------------------------------
        // Create upload folder
        // ------------------------------

        const uploadDirectory =
            path.resolve(
                __dirname,
                "..",
                "uploads",
                "resumes"
            );

        fs.mkdirSync(
            uploadDirectory,
            {
                recursive: true
            }
        );

        // ------------------------------
        // Safe filename
        // ------------------------------

        const baseName =
            path.basename(
                originalFileName,
                extension
            )
            .replace(
                /[^a-zA-Z0-9_-]/g,
                "_"
            );

        const savedFileName =
            `${roomCode}_${Date.now()}_${baseName}${extension}`;

        const savedPath =
            path.join(
                uploadDirectory,
                savedFileName
            );

        // ------------------------------
        // Save
        // ------------------------------

        fs.writeFileSync(
            savedPath,
            fileBuffer
        );

        room.resumeFile =
            savedFileName;

        console.log(
            "Resume received:",
            savedFileName
        );

        sendJSON(
            response,
            200,
            {
                success: true,
                fileName:
                    savedFileName,
                room:
                    roomCode
            }
        );
    }

    catch (error) {

        console.error(
            "Resume upload error:",
            error
        );

        sendJSON(
            response,
            500,
            {
                success: false,
                message:
                    error.message ||
                    "Could not upload resume."
            }
        );
    }

    return;
}

            // ======================================
            // STATUS
            // ======================================

            if (
                request.method ===
                    "GET" &&
                request.url ===
                    "/api/status"
            ) {

                sendJSON(
                    response,
                    200,
                    {
                        server:
                            "online",

                        rooms:
                            meetingRooms.size
                    }
                );


                return;

            }
            if (
                request.method === "GET" &&
                serveStaticFile(
                    request,
                    response
                )
            ) {
                return;
            }

            // ======================================
            // NOT FOUND
            // ======================================

            response.writeHead(
                404,
                {
                    "Content-Type":
                        "text/plain"
                }
            );


            response.end(
                "Not found"
            );

        }
    );


// ==================================================
// WEBSOCKET SERVER
// ==================================================

const wss =
    new WebSocket.Server({
        server:
            server
    });


// ==================================================
// WEBSOCKET CONNECTION
// ==================================================

wss.on(
    "connection",
    function (
        socket,
        request
    ) {

        console.log(
            "WebSocket client connected."
        );


        const url =
            new URL(
                request.url,
                `http://localhost:${PORT}`
            );


        const roomCode =
            (
                url.searchParams.get(
                    "room"
                ) || ""
            )
            .trim()
            .toUpperCase();


        const role =
            (
                url.searchParams.get(
                    "role"
                ) || ""
            )
            .trim()
            .toLowerCase();


        // ==========================================
        // VALIDATE ROOM
        // ==========================================

        const room =
            getValidRoom(
                roomCode
            );


        if (!room) {

            socket.send(
                JSON.stringify({
                    type:
                        "error",

                    message:
                        "Invalid or expired meeting room."
                })
            );


            socket.close();

            return;

        }


        // ==========================================
        // VALIDATE ROLE
        // ==========================================

        if (
            role !==
                "interviewer" &&
            role !==
                "interviewee"
        ) {

            socket.send(
                JSON.stringify({
                    type:
                        "error",

                    message:
                        "Invalid meeting role."
                })
            );


            socket.close();

            return;

        }


        // ==========================================
        // CHECK DUPLICATE PARTICIPANT
        // ==========================================

        if (
            role ===
                "interviewer" &&
            room.interviewer
        ) {

            socket.send(
                JSON.stringify({
                    type:
                        "error",

                    message:
                        "An interviewer is already connected."
                })
            );


            socket.close();

            return;

        }


        if (
            role ===
                "interviewee" &&
            room.interviewee
        ) {

            socket.send(
                JSON.stringify({
                    type:
                        "error",

                    message:
                        "An interviewee is already connected."
                })
            );


            socket.close();

            return;

        }


        // ==========================================
        // SAVE SOCKET
        // ==========================================

        if (
            role ===
            "interviewer"
        ) {

            room.interviewer =
                socket;

        }
        else {

            room.interviewee =
                socket;

        }


        console.log(
            `${role} joined room ${roomCode}`
        );


        // ==========================================
        // CONFIRM JOIN
        // ==========================================

        socket.send(
            JSON.stringify({
                type:
                    "joined-room",

                room:
                    roomCode,

                role:
                    role
            })
        );


        // ==========================================
        // NOTIFY BOTH PARTICIPANTS
        // ==========================================

        const interviewerConnected =
            room.interviewer &&
            room.interviewer.readyState ===
                WebSocket.OPEN;

        const intervieweeConnected =
            room.interviewee &&
            room.interviewee.readyState ===
                WebSocket.OPEN;

        if (
            interviewerConnected &&
            intervieweeConnected
        ) {

            room.interviewer.send(
                JSON.stringify({
                    type:
                        "peer-joined",

                    role:
                        "interviewee"
                })
            );

            room.interviewee.send(
                JSON.stringify({
                    type:
                        "peer-joined",

                    role:
                        "interviewer"
                })
            );
        }
        // ==========================================
        // RELAY SIGNALING MESSAGES
        // ==========================================

        // ==========================================

        socket.on(
            "message",
            function (message) {

                // Convert incoming WebSocket data
                // into JSON text before forwarding it.
                const textMessage =
                    Buffer.isBuffer(message)
                        ? message.toString("utf8")
                        : String(message);


                let parsedMessage;

                try {

                    parsedMessage =
                        JSON.parse(
                            textMessage
                        );

                }
                catch (error) {

                    console.error(
                        "Invalid signaling message:",
                        error
                    );

                    return;
                }


                const otherRole =
                    role ===
                        "interviewer"
                        ? "interviewee"
                        : "interviewer";


                console.log(
                    `SIGNAL ${roomCode}: ${role} -> ${otherRole}: ${parsedMessage.type}`
                );


                const other =
                    role ===
                        "interviewer"
                        ? room.interviewee
                        : room.interviewer;


                if (
                    !other ||
                    other.readyState !==
                    WebSocket.OPEN
                ) {

                    console.log(
                        `SIGNAL NOT DELIVERED: ${otherRole} is not connected.`
                    );

                    return;
                }


                // IMPORTANT:
                // explicitly forward as TEXT
                other.send(
                    textMessage,
                    {
                        binary:
                            false
                    }
                );

            }
        );


        // ==========================================
        // DISCONNECT
        // ==========================================

        socket.on(
            "close",
            function () {

                console.log(
                    `${role} disconnected from ${roomCode}`
                );


                if (
                    role ===
                    "interviewer"
                ) {

                    if (
                        room.interviewer ===
                        socket
                    ) {

                        room.interviewer =
                            null;

                    }

                }
                else {

                    if (
                        room.interviewee ===
                        socket
                    ) {

                        room.interviewee =
                            null;

                    }

                }


                const other =
                    role ===
                        "interviewer"
                        ? room.interviewee
                        : room.interviewer;


                if (
                    other &&
                    other.readyState ===
                        WebSocket.OPEN
                ) {

                    other.send(
                        JSON.stringify({
                            type:
                                "peer-left",

                            role:
                                role
                        })
                    );

                }

            }
        );

    }
);


// ==================================================
// START SERVER with wait for MongoDB
// ==================================================

async function startServer() {
    try {
        await connectToMongoDB();
    } catch (error) {
        console.error(
            "MongoDB unavailable:",
            error.message
        );

        console.warn(
            "Continuing without MongoDB for development."
        );
    }

    server.listen(
        PORT,
        function () {
            console.log(
                `Server running on port ${PORT}`
            );
        }
    );
}

startServer();

// ==================================================
// CLEAN EXPIRED ROOMS
// ==================================================

setInterval(
    function () {

        const now =
            Date.now();


        for (
            const [
                inviteCode,
                room
            ]
            of meetingRooms
        ) {

            if (
                now >
                room.expiresAt
            ) {

                meetingRooms.delete(
                    inviteCode
                );


                console.log(
                    "Removed expired room:",
                    inviteCode
                );

            }

        }

    },
    60 * 1000
);