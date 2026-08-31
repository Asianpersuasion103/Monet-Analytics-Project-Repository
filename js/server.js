"use strict";


// ==================================================
// IMPORTS
// ==================================================

const http =
    require("http");

const crypto =
    require("crypto");

const WebSocket =
    require("ws");


// ==================================================
// CONFIGURATION
// ==================================================

const PORT =
    8080;


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


    let firstPart =
        "";

    let secondPart =
        "";


    // ==============================================
    // FIRST FOUR CHARACTERS
    // ==============================================

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


    // ==============================================
    // SECOND FOUR CHARACTERS
    // ==============================================

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
// CREATE MEETING ROOM
// ==================================================

function createMeetingRoom() {

    let inviteCode;


    // ==============================================
    // MAKE SURE CODE IS UNIQUE
    // ==============================================

    do {

        inviteCode =
            generateInviteCode();

    }
    while (
        meetingRooms.has(
            inviteCode
        )
    );


    // ==============================================
    // CREATE ROOM
    // ==============================================

    const now =
        Date.now();


    const room = {

        inviteCode:
            inviteCode,

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


    // ==============================================
    // SAVE ROOM
    // ==============================================

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

    // ==============================================
    // CHECK CODE
    // ==============================================

    if (!inviteCode) {

        return null;

    }


    // ==============================================
    // FIND ROOM
    // ==============================================

    const room =
        meetingRooms.get(
            inviteCode
        );


    if (!room) {

        return null;

    }


    // ==============================================
    // CHECK EXPIRATION
    // ==============================================

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
// SEND JSON RESPONSE
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

const server =
    http.createServer(
        function (
            request,
            response
        ) {


            // ======================================
            // CORS PREFLIGHT
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

                const room =
                    createMeetingRoom();


                sendJSON(
                    response,
                    200,
                    {
                        success:
                            true,

                        inviteCode:
                            room.inviteCode,

                        room:
                            room.inviteCode,

                        expiresAt:
                            room.expiresAt
                    }
                );


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

                let body =
                    "";


                // ==================================
                // RECEIVE REQUEST BODY
                // ==================================

                request.on(
                    "data",
                    function (chunk) {

                        body +=
                            chunk.toString();

                    }
                );


                // ==================================
                // PROCESS REQUEST
                // ==================================

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


                            // ======================
                            // INVALID ROOM
                            // ======================

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


                            // ======================
                            // INTERVIEWEE EXISTS
                            // ======================

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


                            // ======================
                            // VALID
                            // ======================

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
            // SERVER STATUS
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


            // ======================================
            // NOT FOUND
            // ======================================

            response.writeHead(
                404,
                {
                    "Content-Type":
                        "text/plain",

                    "Access-Control-Allow-Origin":
                        "*"
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


        // ==========================================
        // GET URL
        // ==========================================

        const url =
            new URL(
                request.url,
                `http://localhost:${PORT}`
            );


        // ==========================================
        // GET ROOM CODE
        // ==========================================

        const roomCode =
            (
                url.searchParams.get(
                    "room"
                ) || ""
            )
            .trim()
            .toUpperCase();


        // ==========================================
        // GET ROLE
        // ==========================================

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
        // CHECK DUPLICATE INTERVIEWER
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


        // ==========================================
        // CHECK DUPLICATE INTERVIEWEE
        // ==========================================

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
        // NOTIFY OTHER PARTICIPANT
        // ==========================================

        const otherSocket =
            role ===
                "interviewer"
                ? room.interviewee
                : room.interviewer;


        if (
            otherSocket &&
            otherSocket.readyState ===
                WebSocket.OPEN
        ) {

            otherSocket.send(
                JSON.stringify({

                    type:
                        "peer-joined",

                    role:
                        role

                })
            );

        }


        // ==========================================
        // RELAY WEBRTC SIGNALING
        // ==========================================

        socket.on(
            "message",
            function (message) {

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

                    return;

                }


                other.send(
                    message
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


                // ==================================
                // REMOVE SOCKET FROM ROOM
                // ==================================

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


                // ==================================
                // FIND OTHER PARTICIPANT
                // ==================================

                const other =
                    role ===
                        "interviewer"
                        ? room.interviewee
                        : room.interviewer;


                // ==================================
                // NOTIFY OTHER PARTICIPANT
                // ==================================

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


        // ==========================================
        // SOCKET ERROR
        // ==========================================

        socket.on(
            "error",
            function (error) {

                console.error(
                    `WebSocket error for ${role}:`,
                    error
                );

            }
        );

    }
);


// ==================================================
// START SERVER
// ==================================================

server.listen(
    PORT,
    function () {

        console.log(
            "======================================"
        );

        console.log(
            "WebRTC signaling server started."
        );

        console.log(
            `HTTP server: http://localhost:${PORT}`
        );

        console.log(
            `WebSocket server: ws://localhost:${PORT}`
        );

        console.log(
            "Resume API: http://127.0.0.1:8000"
        );

        console.log(
            "Resume database: Python / SQLite"
        );

        console.log(
            "======================================"
        );

    }
);


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

                // ==============================
                // CLOSE PARTICIPANTS
                // ==============================

                if (
                    room.interviewer &&
                    room.interviewer.readyState ===
                        WebSocket.OPEN
                ) {

                    room.interviewer.close();

                }


                if (
                    room.interviewee &&
                    room.interviewee.readyState ===
                        WebSocket.OPEN
                ) {

                    room.interviewee.close();

                }


                // ==============================
                // DELETE ROOM
                // ==============================

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
