"use server";

import { db } from "@/firebase/admin";
import { generateText } from "ai";
import { google } from "@ai-sdk/google"; // ✅ ADD THIS IMPORT


export async function getInterviewsByUserId(
  userId: string
): Promise<Interview[] | null> {
  const interviews = await db
    .collection("interviews")
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function getLatestInterviews(
  params: GetLatestInterviewsParams
): Promise<Interview[] | null> {
  const { userId, limit = 20 } = params;

  const interviews = await db
    .collection("interviews")
    .where("finalized", "==", true)
    .where("userId", "!=", userId)
    .limit(limit)
    .orderBy("createdAt", "desc")
    .get();

  return interviews.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Interview[];
}

export async function getInterviewById(id: string): Promise<Interview | null> {
  const interview = await db.collection("interviews").doc(id).get();

  return interview.data() as Interview | null;
}

export async function createFeedback(params: CreateFeedbackParams) {
  const { interviewId, userId, transcript } = params;

  console.log("=== CREATE FEEDBACK STARTED ===");
  console.log("Interview ID:", interviewId);
  console.log("User ID:", userId);
  console.log("Transcript length:", transcript.length);

  try {
    const formatedTranscript = transcript
      .map(
        (sentence: { role: string; content: string }) =>
          `- ${sentence.role}: ${sentence.content}\n`
      )
      .join("");

    console.log("Formatted transcript length:", formatedTranscript.length);
    console.log("Calling Google AI...");

    // Use generateText instead of generateObject to avoid tuple/schema issues
    const { text } = await generateText({
      model: google("gemini-2.0-flash-001"),
      prompt: `
        You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
        
        Transcript:
        ${formatedTranscript}

        Please analyze the interview and provide feedback in the following EXACT JSON format. You MUST include ALL five categories in the EXACT order shown:
        {
          "totalScore": <number between 0-100>,
          "categoryScores": [
            {"name": "Communication Skills", "score": <0-100>, "comment": "detailed comment about communication"},
            {"name": "Technical Knowledge", "score": <0-100>, "comment": "detailed comment about technical knowledge"},
            {"name": "Problem Solving", "score": <0-100>, "comment": "detailed comment about problem solving"},
            {"name": "Cultural Fit", "score": <0-100>, "comment": "detailed comment about cultural fit"},
            {"name": "Confidence and Clarity", "score": <0-100>, "comment": "detailed comment about confidence"}
          ],
          "strengths": ["specific strength 1", "specific strength 2", "specific strength 3"],
          "areasForImprovement": ["specific area 1", "specific area 2", "specific area 3"],
          "finalAssessment": "A comprehensive 3-4 sentence paragraph summarizing the overall interview performance, highlighting key strengths and areas for improvement."
        }

        IMPORTANT:
        - Respond ONLY with valid JSON
        - NO markdown formatting, NO code blocks, NO explanations
        - Include all 5 categories in exact order
        - Provide at least 3 strengths and 3 areas for improvement
        - Make comments specific and actionable
        `,
      system:
        "You are a professional interviewer. Always respond with valid JSON only, no additional text or formatting.",
    });

    console.log("AI Response received, parsing JSON...");
    console.log("Raw response:", text.substring(0, 200) + "...");

    // Clean up the response and parse JSON
    let cleanedText = text.trim();

    // Remove markdown code blocks if present
    cleanedText = cleanedText.replace(/```json\n?/g, "").replace(/```\n?/g, "");

    // Remove any leading/trailing whitespace
    cleanedText = cleanedText.trim();

    const feedback = JSON.parse(cleanedText);

    // Validate the structure
    if (
      !feedback.totalScore ||
      !feedback.categoryScores ||
      !feedback.strengths ||
      !feedback.areasForImprovement ||
      !feedback.finalAssessment
    ) {
      throw new Error("Invalid feedback structure received from AI");
    }

    const {
      totalScore,
      categoryScores,
      strengths,
      areasForImprovement,
      finalAssessment,
    } = feedback;

    console.log("Feedback parsed successfully:", {
      totalScore,
      categoriesCount: categoryScores?.length,
      strengthsCount: strengths?.length,
      areasCount: areasForImprovement?.length,
    });

    console.log("Saving to Firestore...");
    const feedbackDoc = await db.collection("feedback").add({
      interviewId,
      userId,
      totalScore,
      categoryScores,
      strengths,
      areasForImprovement,
      finalAssessment,
      createdAt: new Date().toISOString(),
    });

    console.log("✅ Feedback saved successfully! ID:", feedbackDoc.id);

    return {
      success: true,
      feedbackId: feedbackDoc.id,
    };
  } catch (e) {
    console.error("=== CREATE FEEDBACK ERROR ===");
    console.error("Error type:", e?.constructor?.name);
    console.error("Error message:", e?.message);

    if (e instanceof SyntaxError) {
      console.error("JSON Parse Error - Raw text that failed to parse:", e);
    } else {
      console.error("Full error:", e);
    }

    return {
      success: false,
    };
  }
}

export async function getFeedbackByInterviewId(
  params: GetFeedbackByInterviewIdParams
): Promise<Feedback | null> {
  const { interviewId, userId } = params;

  const feedback = await db
    .collection("feedback")
    .where("interviewId", "==", interviewId)
    .where("userId", "==", userId) // ✅ FIXED: Changed "!=" to "=="
    .limit(1)
    .orderBy("createdAt", "desc")
    .get();

  if (feedback.empty) return null;

  const feedbackDoc = feedback.docs[0]; // ✅ FIXED: Typo "beedbackDoc"

  return {
    id: feedbackDoc.id,
    ...feedbackDoc.data(),
  } as Feedback;
}
