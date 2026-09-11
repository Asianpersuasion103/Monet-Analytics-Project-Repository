import os

from dotenv import load_dotenv
from openai import OpenAI

from database import SessionLocal
from models import Resume


# ==========================================
# LOAD ENVIRONMENT
# ==========================================

load_dotenv()


api_key = os.getenv(
    "POLLINATIONS_API_KEY"
)

if not api_key:
    raise RuntimeError(
        "POLLINATIONS_API_KEY was not found."
    )


# ==========================================
# POLLINATIONS CLIENT
# ==========================================

client = OpenAI(
    base_url="https://gen.pollinations.ai/v1",
    api_key=api_key
)


# ==========================================
# RESUME ID
# ==========================================

resume_id = 1


# ==========================================
# GET RESUME FROM SQLITE
# ==========================================

db = SessionLocal()

try:

    resume = (
        db.query(Resume)
        .filter(
            Resume.id == resume_id
        )
        .first()
    )

    if not resume:

        raise RuntimeError(
            f"Resume {resume_id} was not found."
        )

    resume_text = resume.extracted_text

    print(
        f"Found resume: {resume.filename}"
    )

    print(
        f"Extracted text length: {len(resume_text)}"
    )

finally:

    db.close()


# ==========================================
# JOB DESCRIPTION
# ==========================================

#  Note the job description here is hardcoded and something I copy pasted from a job posting, will change later 

job_description = """
Compare the extracted text with this job description.


Join the DataAnnotation team and contribute to developing cutting-edge AI systems, while enjoying the flexibility of remote work and setting your own schedule.

We are looking for an experienced Marketing Data Scientist - AI Trainer to help advance AI development. AI models are increasingly capable of performing complex analytical and scientific reasoning ΓÇö but these systems still need practitioners with real-world quantitative experience to validate whether the outputs actually hold up in practice. That's where you come in.

As a member of DataAnnotation's team, you'll work closely with state-of-the-art AI models on tasks like evaluating AI-generated quantitative analysis, solving technical problems, and providing feedback that directly shapes how these systems reason about data, models, and scientific problems. Whether your background is in data science, astrophysics, economics, biostatistics, operations research, or any other quantitative field, if you think rigorously about data and models, your skills are directly applicable here. Some team members fit this work alongside a full-time role, while others treat it as their primary focus.

To get started, once you sign up for an account, you'll take a short assessment (this serves as our version of an interview). If you pass, you'll receive an email confirmation, and paid work will become available on our platform.

Benefits:

Fully remote: work from anywhere in the US, Canada, UK, Ireland, Australia, and New Zealand.
Flexible schedule: choose which projects you take on and when you work.
Competitive pay: projects are paid hourly, up to $60 USD per hour. Opportunities for higher-paying projects are available with strong performance.
Impact: help shape the future of AI systems built to reason about data and analytics.
Responsibilities:

Evaluate AI-generated quantitative work, including statistical analysis, predictive modeling, scientific reasoning, and data-driven insights, for technical accuracy and real-world validity.
Design and solve quantitative problems used to train and benchmark AI systems, spanning areas like forecasting, experimental analysis, optimization, and statistical inference.
Write clear technical explanations and well-documented analytical code.
Provide feedback that directly shapes the next generation of AI models built for quantitative reasoning.
Qualifications:

2+ years of hands-on experience in a quantitative role or research environment ΓÇö such as data science, statistics, economics, finance, physics, biology, epidemiology, operations research, or any adjacent field.
Some coding experience required, with comfort writing and reviewing analytical code end-to-end.
Practical experience with statistical methods, predictive modeling, and experiment design (e.g., A/B testing, hypothesis testing, regression, classification, time-series forecasting).
Fluency in English (native or bilingual level) with strong writing skills.
A bachelor's degree in a quantitative field is preferred (Statistics, Computer Science, Mathematics, Engineering, or similar); a master's or PhD is a plus.
Relevant credentials are a plus (e.g., Kaggle Competition ranking, AWS/GCP ML certifications, or equivalent demonstrated expertise).

"""


# ==========================================
# SEND TO POLLINATIONS
# ==========================================

print()
print("Sending actual resume text to Pollinations...")


response = client.chat.completions.create(

    model="openai",

    messages=[

        {
            "role": "system",

            "content": """
You are a resume matching assistant.

Compare the candidate's resume against
the job description.

Identify:

- Matching skills that are required for the job
- Missing skills that are required for the job
- Relevant experience between resume and job description
- Inconsistencies within the resume 
- Overall summary

Only use information present in the resume.
Do not invent qualifications.
"""
        },

        {
            "role": "user",

            "content": f"""
RESUME:

{resume_text}


JOB DESCRIPTION:

{job_description}
"""
        }

    ]

)


# ==========================================
# DISPLAY AI RESPONSE
# ==========================================

analysis = (
    response
    .choices[0]
    .message
    .content
)


print()
print("==========================================")
print("AI RESUME ANALYSIS")
print("==========================================")
print()

print(analysis)

print()
print("==========================================")
print("TEST COMPLETE")
print("==========================================")
