"use strict";


// ==================================================
// IMPORTS
// ==================================================

const http =
    require("http");

const fs =
    require("fs");

const path =
    require("path");

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
//
// Stores active meeting rooms.
//
// Example:
//
// K7P4-X92M
//      ↓
// {
//     createdAt: ...,
//     expiresAt: ...,
//     interviewer: null,
//     interviewee: null
// }
//
// ==================================================

const meetingRooms =
    new Map();


// ==================================================
// INVITE CODE SETTINGS
// ==================================================

const INVITE_CODE_LIFETIME =
    30 * 60 * 1000;
// 30 minutes


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
// CREATE UNIQUE ROOM
// ==================================================

function createMeetingRoom() {

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
// VERIFY ROOM
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
            "Meeting room expired:",
            inviteCode
        );


        return null;

    }


    return room;

}


// ==================================================
// JSON RESPONSE HELPER
// ==================================================

function sendJSON(
    response,
    statusCode,
    data
) {

    const body =
        JSON.stringify(
            data
        );


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
        body
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


                            // ==================
                            // INVALID
                            // ==================

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


                            // ==================
                            // INTERVIEWEE
                            // ==================

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


                            // ==================
                            // RESERVE ROOM
                            // ==================

                            sendJSON(
                                response,
                                200,
                                {
                                    valid:
                                        true,

                                    room:
                                        room.inviteCode
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
            // HEALTH CHECK
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
            // DEFAULT RESPONSE
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
            role !== "interviewer" &&
            role !== "interviewee"
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
        // CHECK ROLE AVAILABILITY
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
                        "Interviewer is already connected."
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
                        "Interviewee is already connected."
                })
            );


            socket.close();


            return;

        }


        // ==========================================
        // SAVE CONNECTION
        // ==========================================

        if (
            role ===
            "interviewer"
        ) {

            room.interviewer =
                socket;

        }


        if (
            role ===
            "interviewee"
        ) {

            room.interviewee =
                socket;

        }


        console.log(
            `${role} joined room ${roomCode}`
        );


        // ==========================================
        // TELL CLIENT THEY JOINED
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
        // NOTIFY OTHER USER
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
        // WEBRTC SIGNALING
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


                if (
                    role ===
                    "interviewer"
                ) {

                    room.interviewer =
                        null;

                }


                if (
                    role ===
                    "interviewee"
                ) {

                    room.interviewee =
                        null;

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
            "======================================"

        );

    }
);


// ==================================================
// CLEAN UP EXPIRED ROOMS
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