"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VoiceSearchProps {
  onResult: (text: string) => void;
  className?: string;
}

export default function VoiceSearch({ onResult, className }: VoiceSearchProps) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recog = new SpeechRecognition();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = "en-US";

    recog.onstart = () => {
      setIsListening(true);
    };

    recog.onend = () => {
      setIsListening(false);
    };

    recog.onerror = (event: any) => {
      setIsListening(false);
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied. Please enable it in your browser settings.");
      } else if (event.error === "network") {
        toast.error("Network error occurred during speech recognition.");
      } else {
        console.error("Speech recognition error:", event.error);
      }
    };

    recog.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        onResult(transcript);
      }
    };

    setRecognition(recog);
  }, [onResult]);

  const toggleListening = useCallback(() => {
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.error("Failed to start recognition:", err);
        // Handle case where it's already started or other errors
      }
    }
  }, [recognition, isListening]);

  if (!isSupported) return null;

  return (
    <div className={cn("relative flex items-center", className)}>
      <button
        onMouseDown={(e) => {
          e.preventDefault();
          toggleListening();
        }}
        className={cn(
          "p-2 rounded-full transition-all duration-300 flex items-center justify-center",
          isListening 
            ? "bg-red-50 text-red-500 shadow-inner" 
            : "text-gray-400 hover:text-brand-blue hover:bg-gray-50"
        )}
        title={isListening ? "Stop listening" : "Search by voice"}
      >
        <AnimatePresence mode="wait">
          {isListening ? (
            <motion.div
              key="listening"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative"
            >
              <Mic size={20} strokeWidth={2} />
              <motion.span
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 rounded-full bg-red-400 -z-10"
              />
            </motion.div>
          ) : (
            <motion.div
              key="mic"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
            >
              <Mic size={20} strokeWidth={1.5} />
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {isListening && (
        <motion.span
          initial={{ opacity: 0, x: 5 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute right-full mr-2 text-[10px] font-medium text-red-500 uppercase tracking-widest whitespace-nowrap"
        >
          Listening...
        </motion.span>
      )}
    </div>
  );
}
