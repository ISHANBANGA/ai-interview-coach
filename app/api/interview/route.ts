import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { messages, jobDescription, currentQuestion, isComplete } = await req.json();

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let prompt = "";

    if (isComplete) {
      prompt = `
You are a senior interviewer. Based on this interview conversation, provide a final performance summary.

Job Description:
${jobDescription}

Interview Conversation:
${messages.map((m: { role: string; content: string }) => `${m.role === "user" ? "Candidate" : "Interviewer"}: ${m.content}`).join("\n")}

Return a JSON object with this exact structure:
{
  "overallScore": <number between 0 and 100>,
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<area 1>", "<area 2>"],
  "recommendation": "<Hire | Consider | Not Ready>"
}

Only return the JSON. No extra text, no markdown, no code blocks.
      `;
    } else {
      prompt = `
You are conducting a professional job interview. 

Job Description:
${jobDescription}

Current Question Asked:
${currentQuestion}

Candidate's Answer:
${messages[messages.length - 1].content}

Give brief, constructive feedback on their answer in 2-3 sentences. Be encouraging but honest. 
Then on a new line write "NEXT:" followed by either the next question from the list or "INTERVIEW_COMPLETE" if there are no more questions.

Keep your tone professional and supportive.
      `;
    }

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("Interview API error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}