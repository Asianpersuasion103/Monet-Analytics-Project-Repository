"use strict";

const { Resend } = require("resend");

const resend = new Resend(
    process.env.RESEND_API_KEY
);

async function sendInterviewInvitation(
    applicantEmail,
    inviteCode
) {
    if (!applicantEmail) {
        throw new Error(
            "Applicant email is required."
        );
    }

    if (!inviteCode) {
        throw new Error(
            "Invite code is required."
        );
    }

    const fromAddress =
        process.env.EMAIL_FROM ||
        "Monet Interviews <onboarding@resend.dev>";

    const appBaseURL =
        process.env.APP_BASE_URL;

    if (!appBaseURL) {
        throw new Error(
            "APP_BASE_URL is not configured."
        );
    }

    const applicantLink =
    `${process.env.APP_BASE_URL}/htmls/interviewee.html?code=${encodeURIComponent(inviteCode)}`;

    const { data, error } =
        await resend.emails.send({
            from: fromAddress,

            to: applicantEmail,

            subject:
                "Your Monet Interview Invitation",

            html: `
                <h2>
                    Monet Interview Invitation
                </h2>

                <p>
                    You have been invited to begin
                    your interview.
                </p>

                <p>
                    Your meeting code is:
                </p>

                <p
                    style="
                        font-size: 24px;
                        font-weight: bold;
                        letter-spacing: 2px;
                    "
                >
                    ${inviteCode}
                </p>

                <p>
                    <a
                        href="${applicantLink}"
                        style="
                            display: inline-block;
                            padding: 12px 20px;
                            background: #2563eb;
                            color: white;
                            text-decoration: none;
                            border-radius: 6px;
                            font-weight: bold;
                        "
                    >
                        Open Interview Invitation
                    </a>
                </p>

                <p>
                    Click the button above to open
                    the Monet applicant page.
                </p>

                <p>
                    If necessary, you can manually
                    enter the meeting code shown above.
                </p>
            `
        });

    if (error) {
        throw new Error(
            error.message ||
            "Unable to send interview invitation."
        );
    }

    return data;
}

module.exports = {
    sendInterviewInvitation
};