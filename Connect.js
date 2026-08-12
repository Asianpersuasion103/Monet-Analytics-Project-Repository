"use strict";

const testButton1 = document.querySelector("#interviewerButton");
const testButton2 = document.querySelector("#intervieweeButton");

testButton1.addEventListener("click", () => {
  console.log("Working!");
  window.location.href = "interviewer.html";

  /*alert("Let's prepare your meeting!");*/
});

document.getElementById("intervieweeButton").addEventListener("click", function () {
    window.location.href = "Interviewee Page.html";
});

  /*alert("Get ready for your interview!");*/