"use strict";

const testButton1 = document.querySelector("#interviewerButton");
const testButton2 = document.querySelector("#intervieweeButton");

testButton1.addEventListener("click", () => {
  console.log("Working!");
  window.location.href = "interviewer.html";

  /*alert("Let's prepare your meeting!");*/
});

testButton2.addEventListener("click", () => {
  console.log("Working!");
  window.location.href = "interviewee.html";

  /*alert("Get ready for your interview!");*/
});