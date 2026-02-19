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

export default function Home() {
  const [jobDescription, setJobDescription] = useState("");
  const [resume, setResume] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!jobDescription.trim() || !resume.trim()) {
      setError("Please fill in both the Job Description and Resume fields.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

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

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900">AI Interview Coach</h1>
          <p className="text-gray-500 mt-2">Paste your Job Description and Resume to get your match score and interview questions.</p>
        </div>

        {/* Input Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Job Description</label>
            <textarea
              className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Paste the job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Resume</label>
            <textarea
              className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
            </div>

          </div>
        )}
      </div>
    </main>
  );
}