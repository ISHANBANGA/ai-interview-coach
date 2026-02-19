import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { jobDescription, resume } = await req.json();

    if (!jobDescription || !resume) {
      return NextResponse.json(
        { error: "Job description and resume are required." },
        { status: 400 }
      );
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are a senior technical recruiter and interview coach.

Analyze the following resume against the job description and return a JSON response with this exact structure:
{
  "matchScore": <number between 0 and 100>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "missingSkills": ["<missing skill 1>", "<missing skill 2>"],
  "interviewQuestions": [
    { "question": "<question 1>", "type": "<Behavioral | Technical | Situational>" },
    { "question": "<question 2>", "type": "<Behavioral | Technical | Situational>" },
    { "question": "<question 3>", "type": "<Behavioral | Technical | Situational>" },
    { "question": "<question 4>", "type": "<Behavioral | Technical | Situational>" },
    { "question": "<question 5>", "type": "<Behavioral | Technical | Situational>" }
  ]
}

Only return the JSON. No extra text, no markdown, no code blocks.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resume}
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Gemini API error:", JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}