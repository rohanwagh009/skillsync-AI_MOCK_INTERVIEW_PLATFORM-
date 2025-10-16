"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { vapi } from "@/lib/vapi.sdk";
import { createFeedback } from "@/lib/actions/general.action";

import { interviewer } from "@/constants";

enum CallStatus {
  INACTIVE = "INACTIVE",
  ACTIVE = "ACTIVE",
  CONNECTING = "CONNECTING",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface AgentProps {
  userName: string;
  userId: string;
  type: string;
  interviewId: string;
  questions?: string[];
}

const Agent = ({
  userName,
  userId,
  type,
  interviewId,
  questions,
}: AgentProps) => {
  const router = useRouter();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);

  useEffect(() => {
    const onCallStart = () => setCallStatus(CallStatus.ACTIVE);
    const onCallEnd = () => setCallStatus(CallStatus.FINISHED);

    const onMessage = (message: Message) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { role: message.role, content: message.transcript };
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    const onSpeechStart = () => setIsSpeaking(true);
    const onSpeechEnd = () => setIsSpeaking(false);
    const onError = (error: Error) => console.log("Error", error);

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, []);

  const handleGenerateFeedback = async (messages: SavedMessage[]) => {
    console.log("Generating feedback...");

    try {
      const { success, feedbackId: id } = await createFeedback({
        interviewId: interviewId!,
        userId: userId!,
        transcript: messages,
      });

      if (success && id) {
        console.log("Feedback generated successfully:", id);
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        console.error("Error: Feedback creation returned success=false");
        router.push("/");
      }
    } catch (error) {
      console.error("Error generating feedback:", error);
      router.push("/");
    }
  };

  // ✅ FIXED: Removed duplicate redirect and made logic clearer
  useEffect(() => {
    if (callStatus === CallStatus.FINISHED) {
      if (type === "generate") {
        // For workflow generation, just go back home
        router.push("/");
      } else {
        // For interviews, generate feedback and redirect will happen in handleGenerateFeedback
        handleGenerateFeedback(messages);
      }
    }
  }, [callStatus, type]); // ✅ Removed 'messages' and 'userId' from deps to prevent unnecessary re-runs

  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);

    if (type === "generate") {
      await vapi.start(
        undefined, // No assistant
        undefined, // No assistant overrides
        undefined, // No function overrides
        process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!, // Your workflow ID (4th position)
        {
          variableValues: {
            username: userName,
            userid: userId,
          },
        }
      );
    } else {
      let formattedQuestions = "";

      if (questions) {
        formattedQuestions = questions
          .map((question) => `- ${question}`)
          .join("\n");
      }

      await vapi.start(interviewer, {
        variableValues: {
          questions: formattedQuestions,
        },
      });
    }

    console.log(
      "WORKFLOW ID BEING USED:",
      process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID
    );
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  const latestMessage = messages[messages.length - 1]?.content;
  const isCallInactiveorFinished =
    callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED;

  return (
    <>
      <div className="call-view">
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="vapi"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="user-avatar"
              width={540}
              height={540}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={latestMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {latestMessage}
            </p>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== CallStatus.ACTIVE ? (
          <button className="relative btn-call" onClick={handleCall}>
            <span
              className={cn(
                "absolute animate-pin rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />

            <span>{isCallInactiveorFinished ? "Call" : ". . ."}</span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={handleDisconnect}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
