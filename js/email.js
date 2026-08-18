"use strict";

const { Resend } = require("resend");
const resend = new Resend (process.env.RESEND_API_KEY);
async function sendInterviewInvitation(applicantEmail, inviteCode) {
    if (!applicantEmail){
        throw new Error("Applicant email is required");
    }

    if (!inviteCode){
        throw new Error("Invite code is required");
    }

    const fromAddress = 
    process.env.EMAIL_FROM ||
    "Monet Interviews <onboarding@resend.dev>" ;
    
    const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: applicantEmail,
        subject: "Your Monet Interview Invitation",
        html: `
            <h2> Monet Interview Invitation </h2>
            <p> You were invited to begin your interview </p>
            <p> Your meeting code is: "</p>
            <p style ="
                font-size: 24px;
                font-weight: bold;
                letter-spacing: 2px;
            ">
                ${inviteCode}
            </p>
            <p> 
                Here are some instructions: Open the Monet Interview
                platform, choose <strong> Interviewee </strong>
                and enter the code above.
            </p>
            `
    });
    if(error){
        throw new Error(
            error.message || "Unable to send invite code."
        ); 
    }
    return data;
}

module.exports = {
    sendInterviewInvitation
};