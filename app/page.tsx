"use client";

import { useState, useRef } from "react";
import { darkTheme } from "@/themes/darkTheme";
import { lightTheme } from "@/themes/lightTheme";
import { spaceTheme } from "@/themes/spaceTheme";

const themes = [darkTheme, lightTheme, spaceTheme];

interface AnalysisResult {
  matchScore: number;
  summary: string;
  strengths: string[];
  missingSkills: string[];
  interviewQuestions: {
    question: string;
    type: string;
  }[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface InterviewSummary {
  overallScore: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendation: string;
}

export default function Home() {
  const [themeIndex, setThemeIndex] = useState(0);
  
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [summary, setSummary] = useState<InterviewSummary | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Theme variables
  const theme = themes[themeIndex];

  const handleAnalyze = async () => {
    if (!jobDescription.trim() || !resume.trim()) {
      setError("Please fill in both the Job Description and Resume fields.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    setInterviewStarted(false);
    setMessages([]);
    setCurrentQuestionIndex(0);
    setInterviewComplete(false);
    setSummary(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, resume }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Something went wrong."); return; }
      setResult(data);
    } catch {
      setError("Failed to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startInterview = () => {
    if (!result) return;
    setInterviewStarted(true);
    setMessages([{
      role: "assistant",
      content: `Let's begin your mock interview! I'll ask you ${result.interviewQuestions.length} questions.\n\nQuestion 1 of ${result.interviewQuestions.length}: ${result.interviewQuestions[0].question}`
    }]);
  };

  const handleAnswerSubmit = async () => {
    if (!currentAnswer.trim() || !result) return;
    const currentQuestion = result.interviewQuestions[currentQuestionIndex].question;
    const newMessages: Message[] = [...messages, { role: "user", content: currentAnswer }];
    setMessages(newMessages);
    setCurrentAnswer("");
    setInterviewLoading(true);

    try {
      const isLastQuestion = currentQuestionIndex === result.interviewQuestions.length - 1;
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, jobDescription, currentQuestion, isComplete: false }),
      });
      const data = await response.json();
      const responseText = data.response;
      const hasNext = responseText.includes("NEXT:");
      const feedbackPart = hasNext ? responseText.split("NEXT:")[0].trim() : responseText.trim();
      const nextPart = hasNext ? responseText.split("NEXT:")[1].trim() : "";
      const updatedMessages: Message[] = [...newMessages, { role: "assistant", content: feedbackPart }];

      if (isLastQuestion || nextPart === "INTERVIEW_COMPLETE") {
        setMessages(updatedMessages);
        const summaryResponse = await fetch("/api/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: updatedMessages, jobDescription, currentQuestion, isComplete: true }),
        });
        const summaryData = await summaryResponse.json();
        const parsed = JSON.parse(summaryData.response);
        setSummary(parsed);
        setInterviewComplete(true);
        setMessages([...updatedMessages, { role: "assistant", content: "Interview complete! See your performance summary below. 🎉" }]);
      } else {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        setMessages([...updatedMessages, {
          role: "assistant",
          content: `Question ${nextIndex + 1} of ${result.interviewQuestions.length}: ${result.interviewQuestions[nextIndex].question}`
        }]);
      }
    } catch {
      setError("Something went wrong during the interview.");
    } finally {
      setInterviewLoading(false);
    }
  };

  const scoreColor = (score: number) => score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, transition: "background 0.3s ease", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 16px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "48px" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: theme.text, margin: 0 }}>AI Interview Coach</h1>
            <p style={{ color: theme.subtext, fontSize: "0.9rem", marginTop: "4px" }}>Resume analysis · Skill matching · Mock interviews</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
  {themes.map((t, i) => (
    <button
      key={t.name}
      onClick={() => setThemeIndex(i)}
      style={{
        padding: "8px 14px", borderRadius: "8px", fontSize: "0.8rem", fontWeight: 600,
        cursor: "pointer", transition: "all 0.2s ease",
        background: themeIndex === i ? theme.btnBg : theme.card,
        color: themeIndex === i ? "#ffffff" : theme.text,
        border: `1px solid ${themeIndex === i ? theme.btnBg : theme.cardBorder}`,
      }}
    >
      {t.name === "Dark" ? "🌙" : t.name === "Light" ? "☀️" : "🚀"} {t.name}
    </button>
  ))}
</div>
        </div>

        {/* Input Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
          <div>
            <label style={{ color: theme.label, fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
              Job Description
            </label>
            <textarea
              style={{ width: "100%", height: "220px", padding: "14px", borderRadius: "10px", border: `1px solid ${theme.inputBorder}`, background: theme.inputBg, color: theme.inputText, fontSize: "0.875rem", lineHeight: 1.6, resize: "none", outline: "none", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }}
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>
          <div>
            <label style={{ color: theme.label, fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
              Your Resume
            </label>
            <textarea
              style={{ width: "100%", height: "220px", padding: "14px", borderRadius: "10px", border: `1px solid ${theme.inputBorder}`, background: theme.inputBg, color: theme.inputText, fontSize: "0.875rem", lineHeight: 1.6, resize: "none", outline: "none", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }}
              placeholder="Paste your resume here..."
              value={resume}
              onChange={(e) => setResume(e.target.value)}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: "16px", padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", color: "#ef4444", fontSize: "0.875rem" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Analyze Button */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            style={{ padding: "14px 40px", borderRadius: "8px", background: loading ? theme.subtext : theme.btnBg, color: "#ffffff", fontSize: "0.9rem", fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer", transition: "all 0.3s ease" }}
          >
            {loading ? "Analyzing..." : "Analyze & Generate Questions"}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Match Score */}
            <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: "12px", padding: "32px", textAlign: "center", boxShadow: theme.shadow }}>
              <p style={{ color: theme.subtext, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Resume Match Score</p>
              <p style={{ fontSize: "5rem", fontWeight: 900, color: scoreColor(result.matchScore), lineHeight: 1 }}>{result.matchScore}%</p>
              <p style={{ color: theme.subtext, marginTop: "16px", fontSize: "0.9rem", lineHeight: 1.6, maxWidth: "600px", margin: "16px auto 0" }}>{result.summary}</p>
            </div>

            {/* Strengths & Gaps */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: "12px", padding: "24px", boxShadow: theme.shadow }}>
                <p style={{ color: "#10b981", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>✅ Strengths</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                  {result.strengths.map((s, i) => (
                    <li key={i} style={{ fontSize: "0.875rem", color: theme.text, display: "flex", gap: "8px" }}>
                      <span style={{ color: "#10b981" }}>•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: "12px", padding: "24px", boxShadow: theme.shadow }}>
                <p style={{ color: "#f59e0b", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>⚠️ Missing Skills</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                  {result.missingSkills.map((s, i) => (
                    <li key={i} style={{ fontSize: "0.875rem", color: theme.text, display: "flex", gap: "8px" }}>
                      <span style={{ color: "#f59e0b" }}>•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Interview Questions */}
            <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: "12px", padding: "24px", boxShadow: theme.shadow }}>
              <p style={{ color: theme.label, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>🎯 Interview Questions</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {result.interviewQuestions.map((q, i) => (
                  <div key={i} style={{ padding: "16px", background: theme.inputBg, borderRadius: "8px", border: `1px solid ${theme.cardBorder}` }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "0.08em", background: theme.tagBg, color: theme.tagText }}>
                      {q.type}
                    </span>
                    <p style={{ color: theme.text, fontSize: "0.875rem", marginTop: "10px", lineHeight: 1.6 }}>{q.question}</p>
                  </div>
                ))}
              </div>
              {!interviewStarted && (
                <div style={{ textAlign: "center", marginTop: "24px" }}>
                  <button onClick={startInterview}
                    style={{ padding: "14px 40px", borderRadius: "8px", background: theme.greenBtn, color: "#ffffff", fontSize: "0.9rem", fontWeight: 700, border: "none", cursor: "pointer" }}>
                    🎤 Start Mock Interview
                  </button>
                </div>
              )}
            </div>

            {/* Interview Chat */}
            {interviewStarted && (
              <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: "12px", padding: "24px", boxShadow: theme.shadow }}>
                <p style={{ color: theme.label, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>🎤 Mock Interview</p>
                <div style={{ maxHeight: "400px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
                  {messages.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "80%", padding: "12px 16px", borderRadius: "12px", fontSize: "0.875rem", lineHeight: 1.7,
                        background: m.role === "user" ? theme.chatUserBg : theme.chatAiBg,
                        border: m.role === "user" ? "none" : `1px solid ${theme.chatAiBorder}`,
                        color: m.role === "user" ? "#ffffff" : theme.chatAiText
                      }}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {interviewLoading && (
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <div style={{ padding: "12px 16px", borderRadius: "12px", background: theme.chatAiBg, border: `1px solid ${theme.chatAiBorder}`, color: theme.subtext, fontSize: "0.875rem" }}>
                        Thinking...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                {!interviewComplete && (
                  <div style={{ display: "flex", gap: "12px" }}>
                    <textarea
                      style={{ flex: 1, padding: "12px", borderRadius: "8px", border: `1px solid ${theme.inputBorder}`, background: theme.inputBg, color: theme.inputText, fontSize: "0.875rem", lineHeight: 1.6, resize: "none", outline: "none", fontFamily: "system-ui, sans-serif" }}
                      rows={3}
                      placeholder="Type your answer here..."
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      disabled={interviewLoading}
                    />
                    <button onClick={handleAnswerSubmit} disabled={interviewLoading || !currentAnswer.trim()}
                      style={{ padding: "0 24px", borderRadius: "8px", background: interviewLoading || !currentAnswer.trim() ? theme.subtext : theme.btnBg, color: "#ffffff", fontWeight: 700, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                      Send
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            {summary && (
              <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: "12px", padding: "32px", boxShadow: theme.shadow }}>
                <p style={{ color: theme.label, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "24px" }}>📊 Performance Summary</p>
                <div style={{ textAlign: "center", marginBottom: "28px" }}>
                  <p style={{ color: theme.subtext, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>Overall Interview Score</p>
                  <p style={{ fontSize: "5rem", fontWeight: 900, color: scoreColor(summary.overallScore), lineHeight: 1 }}>{summary.overallScore}%</p>
                  <span style={{
                    display: "inline-block", marginTop: "12px", padding: "4px 20px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 700,
                    background: summary.recommendation === "Hire" ? "rgba(16,185,129,0.1)" : summary.recommendation === "Consider" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                    color: summary.recommendation === "Hire" ? "#10b981" : summary.recommendation === "Consider" ? "#f59e0b" : "#ef4444",
                    border: `1px solid ${summary.recommendation === "Hire" ? "rgba(16,185,129,0.3)" : summary.recommendation === "Consider" ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`
                  }}>
                    {summary.recommendation}
                  </span>
                  <p style={{ color: theme.subtext, marginTop: "16px", fontSize: "0.9rem", lineHeight: 1.6, maxWidth: "600px", margin: "16px auto 0" }}>{summary.summary}</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div>
                    <p style={{ color: "#10b981", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>✅ What You Did Well</p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                      {summary.strengths.map((s, i) => (
                        <li key={i} style={{ fontSize: "0.875rem", color: theme.text, display: "flex", gap: "8px" }}>
                          <span style={{ color: "#10b981" }}>•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p style={{ color: theme.label, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "12px" }}>📈 Areas to Improve</p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                      {summary.improvements.map((s, i) => (
                        <li key={i} style={{ fontSize: "0.875rem", color: theme.text, display: "flex", gap: "8px" }}>
                          <span style={{ color: theme.label }}>•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}