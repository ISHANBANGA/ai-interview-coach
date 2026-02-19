"use client";

import { useState } from "react";

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
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  // Interview states
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [summary, setSummary] = useState<InterviewSummary | null>(null);

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

      if (!response.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setResult(data);
    } catch (err) {
      setError("Failed to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startInterview = () => {
    if (!result) return;
    setInterviewStarted(true);
    const firstQuestion = result.interviewQuestions[0].question;
    setMessages([{ role: "assistant", content: `Let's begin your mock interview! I'll ask you ${result.interviewQuestions.length} questions based on the job description.\n\n**Question 1:** ${firstQuestion}` }]);
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
        body: JSON.stringify({
          messages: newMessages,
          jobDescription,
          currentQuestion,
          isComplete: false,
        }),
      });

      const data = await response.json();
      const responseText = data.response;

      const hasNext = responseText.includes("NEXT:");
      const feedbackPart = hasNext ? responseText.split("NEXT:")[0].trim() : responseText.trim();
      const nextPart = hasNext ? responseText.split("NEXT:")[1].trim() : "";

      const updatedMessages: Message[] = [...newMessages, { role: "assistant", content: feedbackPart }];

      if (isLastQuestion || nextPart === "INTERVIEW_COMPLETE") {
        setMessages(updatedMessages);
        setInterviewLoading(true);

        // Get final summary
        const summaryResponse = await fetch("/api/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages,
            jobDescription,
            currentQuestion,
            isComplete: true,
          }),
        });

        const summaryData = await summaryResponse.json();
        const parsed = JSON.parse(summaryData.response);
        setSummary(parsed);
        setInterviewComplete(true);
        setMessages([...updatedMessages, { role: "assistant", content: "Interview complete! See your performance summary below. 🎉" }]);
      } else {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        const nextQuestion = result.interviewQuestions[nextIndex].question;
        setMessages([...updatedMessages, {
          role: "assistant",
          content: `**Question ${nextIndex + 1}:** ${nextQuestion}`
        }]);
      }
    } catch (err) {
      setError("Something went wrong during the interview.");
    } finally {
      setInterviewLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900">AI Interview Coach</h1>
          <p className="text-gray-500 mt-2">Paste your Job Description and Resume to get your match score and practice your interview.</p>
        </div>

        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Job Description</label>
            <textarea
              className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Resume</label>
            <textarea
              className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
              placeholder="Paste your resume here..."
              value={resume}
              onChange={(e) => setResume(e.target.value)}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Analyze Button */}
        <div className="text-center mb-10">
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-10 py-3 rounded-lg transition-colors"
          >
            {loading ? "Analyzing..." : "Analyze & Generate Questions"}
          </button>
        </div>

        {/* Results Section */}
        {result && (
          <div className="space-y-6">

            {/* Match Score */}
            <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
              <p className="text-gray-500 text-sm mb-1">Resume Match Score</p>
              <p className={`text-6xl font-bold ${result.matchScore >= 70 ? "text-green-500" : result.matchScore >= 40 ? "text-yellow-500" : "text-red-500"}`}>
                {result.matchScore}%
              </p>
              <p className="text-gray-600 mt-4 text-sm">{result.summary}</p>
            </div>

            {/* Strengths and Missing Skills */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="font-semibold text-gray-800 mb-4">✅ Your Strengths</h2>
                <ul className="space-y-2">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="font-semibold text-gray-800 mb-4">⚠️ Missing Skills</h2>
                <ul className="space-y-2">
                  {result.missingSkills.map((s, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <span className="text-yellow-500 mt-0.5">•</span> {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Interview Questions */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="font-semibold text-gray-800 mb-4">🎯 Interview Questions</h2>
              <div className="space-y-4">
                {result.interviewQuestions.map((q, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full mr-2 ${
                      q.type === "Technical" ? "bg-blue-100 text-blue-700" :
                      q.type === "Behavioral" ? "bg-purple-100 text-purple-700" :
                      "bg-orange-100 text-orange-700"
                    }`}>
                      {q.type}
                    </span>
                    <p className="text-sm text-gray-700 mt-2">{q.question}</p>
                  </div>
                ))}
              </div>

              {/* Start Interview Button */}
              {!interviewStarted && (
                <div className="text-center mt-6">
                  <button
                    onClick={startInterview}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-10 py-3 rounded-lg transition-colors"
                  >
                    🎤 Start Mock Interview
                  </button>
                </div>
              )}
            </div>

            {/* Interview Simulator */}
            {interviewStarted && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="font-semibold text-gray-800 mb-4">🎤 Mock Interview</h2>

                {/* Chat Messages */}
                <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] p-4 rounded-lg text-sm ${
                        m.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {interviewLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 text-gray-500 p-4 rounded-lg text-sm">
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>

                {/* Answer Input */}
                {!interviewComplete && (
                  <div className="flex gap-3">
                    <textarea
                      className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                      rows={3}
                      placeholder="Type your answer here..."
                      value={currentAnswer}
                      onChange={(e) => setCurrentAnswer(e.target.value)}
                      disabled={interviewLoading}
                    />
                    <button
                      onClick={handleAnswerSubmit}
                      disabled={interviewLoading || !currentAnswer.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-6 rounded-lg transition-colors"
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Final Summary */}
            {summary && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="font-semibold text-gray-800 mb-4">📊 Performance Summary</h2>

                <div className="text-center mb-6">
                  <p className="text-gray-500 text-sm mb-1">Overall Interview Score</p>
                  <p className={`text-6xl font-bold ${summary.overallScore >= 70 ? "text-green-500" : summary.overallScore >= 40 ? "text-yellow-500" : "text-red-500"}`}>
                    {summary.overallScore}%
                  </p>
                  <span className={`inline-block mt-2 px-4 py-1 rounded-full text-sm font-semibold ${
                    summary.recommendation === "Hire" ? "bg-green-100 text-green-700" :
                    summary.recommendation === "Consider" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {summary.recommendation}
                  </span>
                  <p className="text-gray-600 mt-4 text-sm">{summary.summary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">✅ What You Did Well</h3>
                    <ul className="space-y-2">
                      {summary.strengths.map((s, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-green-500">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">📈 Areas to Improve</h3>
                    <ul className="space-y-2">
                      {summary.improvements.map((s, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-blue-500">•</span> {s}
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
    </main>
  );
}