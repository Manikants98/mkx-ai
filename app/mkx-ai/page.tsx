"use client";
import { languages, levels, locations } from "@/mock/mock";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import {
  CssBaseline,
  CssVarsProvider,
  extendTheme,
  IconButton,
  Option,
  Select,
  Skeleton,
  useColorScheme,
} from "@mui/joy";
import classNames from "classnames";
import React, { useEffect, useRef, useState } from "react";
import TypewriterMarkdown from "../components/typeanimation";

const theme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          50: "#f0f7ff",
          100: "#c2e0ff",
          200: "#99ccf3",
          300: "#66b2ff",
          400: "#3399ff",
          500: "#007fff",
          600: "#0072e5",
          700: "#0059b2",
          800: "#004c99",
          900: "#003a75",
        },
        background: {
          body: "#ffffff",
          surface: "#f5f5f5",
        },
        text: {
          primary: "#1c1c1c",
          secondary: "#6b7280",
        },
      },
    },
    dark: {
      palette: {
        primary: {
          50: "#c2e0ff",
          100: "#99ccf3",
          200: "#66b2ff",
          300: "#3399ff",
          400: "#007fff",
          500: "#0072e5",
          600: "#0059b2",
          700: "#004c99",
          800: "#003a75",
          900: "#003366",
        },
        background: {
          body: "#121212",
          surface: "#1e1e1e",
        },
        text: {
          primary: "#ffffff",
          secondary: "#9ca3af",
        },
      },
    },
  },
});

function ModeToggle() {
  const { mode, setMode } = useColorScheme();

  useEffect(() => {
    document.body.classList.toggle("dark", mode === "dark");
    document.body.classList.toggle("light", mode === "light");
  }, [mode]);
  return (
    <IconButton
      variant="outlined"
      onClick={() => setMode(mode === "dark" ? "light" : "dark")}
      size="sm"
    >
      {mode === "dark" ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
    </IconButton>
  );
}

export default function MkxAI() {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("high-school");
  const [location, setLocation] = useState("in");
  const [language, setLanguage] = useState("en-IN");
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [responseId, setResponseId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadersRef = useRef<HTMLDivElement>(null);
  const colorScheme = useColorScheme();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  useEffect(() => {
    if (isLoading && loadersRef.current) {
      loadersRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setConversation((prev: Array<{ role: string; content: string }>) => [
      ...prev,
      { role: "user", content: query },
    ]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/mkx-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          responseId,
          interaction: "search",
          safesearch: "active",
          level: level,
          location: location,
          language: language,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const data = await response.json();

      if (data.responseId) {
        setResponseId(data.responseId);
      }
      setConversation((prev: Array<{ role: string; content: string }>) => [
        ...prev,
        { role: "assistant", content: data.response },
      ]);
    } catch (error) {
      console.error("Error:", error);
      setConversation((prev: Array<{ role: string; content: string }>) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setQuery("");
    }
  };

  return (
    <CssVarsProvider theme={theme} defaultMode="light">
      <CssBaseline />
      {conversation.length === 0 ? (
        <div className="h-screen w-full flex flex-col gap-7 justify-center items-center transition-colors duration-300">
          <div className="flex flex-col rounded-lg p-4 items-center">
            <p className="text-[1.875rem] font-bold bg-gradient-to-r from-[#9333ea] via-[#ec4899] to-[#3b82f6] bg-clip-text text-transparent animate-pulse">
              MKx AI
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Ask me anything about the MKx AI
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="w-11/12 lg:w-3/5 h-32 flex flex-col rounded-lg border-2 border-gray-200/60 dark:border-gray-500/20 shadow-md"
          >
            <textarea
              value={query}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setQuery(e.target.value)
              }
              placeholder="Ask me anything..."
              className="w-full h-full p-3 outline-none resize-none font-inherit text-inherit bg-transparent border-none"
            />
            <div className="flex justify-between items-center p-2">
              <div className="flex gap-2 items-center">
                <Select
                  size="sm"
                  value={level}
                  onChange={(_, value) => setLevel(value ?? "high-school")}
                  className="w-44"
                >
                  {levels?.map((level) => (
                    <Option key={level.value} value={level.value}>
                      {level.label}
                    </Option>
                  ))}
                </Select>
                <Select
                  size="sm"
                  className="w-32 !hidden lg:!flex"
                  value={location}
                  onChange={(_, value) => setLocation(value ?? "in")}
                >
                  {locations?.map((location) => (
                    <Option key={location.value} value={location.value}>
                      {location.label}
                    </Option>
                  ))}
                </Select>
                <Select
                  size="sm"
                  className="w-40 !hidden lg:!flex"
                  value={language}
                  onChange={(_, value) => setLanguage(value ?? "en-IN")}
                >
                  {languages?.map((language) => (
                    <Option key={language.value} value={language.value}>
                      {language.label}
                    </Option>
                  ))}
                </Select>
              </div>
              <div className="flex gap-1">
                <ModeToggle />
                <IconButton variant="outlined" size="sm" type="submit">
                  <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                    <g strokeWidth="0"></g>
                    <g strokeLinecap="round" strokeLinejoin="round"></g>
                    <g>
                      <path
                        d="M11.5003 12H5.41872M5.24634 12.7972L4.24158 15.7986C3.69128 17.4424 3.41613 18.2643 3.61359 18.7704C3.78506 19.21 4.15335 19.5432 4.6078 19.6701C5.13111 19.8161 5.92151 19.4604 7.50231 18.7491L17.6367 14.1886C19.1797 13.4942 19.9512 13.1471 20.1896 12.6648C20.3968 12.2458 20.3968 11.7541 20.1896 11.3351C19.9512 10.8529 19.1797 10.5057 17.6367 9.81135L7.48483 5.24303C5.90879 4.53382 5.12078 4.17921 4.59799 4.32468C4.14397 4.45101 3.77572 4.78336 3.60365 5.22209C3.40551 5.72728 3.67772 6.54741 4.22215 8.18767L5.24829 11.2793C5.34179 11.561 5.38855 11.7019 5.407 11.8459C5.42338 11.9738 5.42321 12.1032 5.40651 12.231C5.38768 12.375 5.34057 12.5157 5.24634 12.7972Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </g>
                  </svg>
                </IconButton>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="h-screen w-full flex flex-col gap-7 py-2 justify-between items-center transition-colors duration-300">
          <p className="text-[1.875rem] dark:bg-[#121212] bg-white w-full sticky top-0 font-bold bg-gradient-to-r from-[#9333ea] via-[#ec4899] to-[#3b82f6] bg-clip-text text-transparent animate-pulse">
            MKx AI
          </p>
          <div
            ref={messagesEndRef}
            className={classNames(
              "h-full flex overflow-y-auto",
              isLoading ? "justify-start" : "justify-center"
            )}
          >
            <div className="flex flex-col w-full lg:w-3/5 gap-2">
              {conversation.map((message, index) => (
                <React.Fragment key={index}>
                  {message.role === "assistant" ? (
                    <div className="flex px-6 text-black dark:text-white flex-col">
                      <TypewriterMarkdown>{message.content}</TypewriterMarkdown>
                    </div>
                  ) : (
                    <div className="flex justify-end p-2 gap-2">
                      <p className="text-white bg-gray-800 rounded-lg p-3">
                        {message.content}
                      </p>
                    </div>
                  )}
                </React.Fragment>
              ))}
              {isLoading && (
                <div
                  ref={loadersRef}
                  className="flex flex-col gap-2 px-4 lg:w-[60vw] w-[90vw] h-full"
                >
                  <Skeleton variant="text" className="!w-full" />
                  <Skeleton variant="text" className="!w-2/3" />
                  <Skeleton variant="text" className="!w-full" />
                  <Skeleton variant="text" className="!w-1/2" />
                  <Skeleton variant="text" className="!w-3/4" />
                  <Skeleton variant="text" className="!w-full" />
                  <Skeleton variant="text" className="!w-2/3" />
                  <Skeleton variant="text" className="!w-full" />
                  <Skeleton variant="text" className="!w-1/2" />
                  <Skeleton variant="text" className="!w-3/4" />
                  <Skeleton variant="text" className="!w-full" />
                  <Skeleton variant="text" className="!w-2/3" />
                  <Skeleton variant="text" className="!w-full" />
                  <Skeleton variant="text" className="!w-1/2" />
                  <Skeleton variant="text" className="!w-3/4" />
                </div>
              )}
            </div>
          </div>
          <form
            onSubmit={handleSubmit}
            style={{
              backgroundColor:
                colorScheme.mode === "dark" ? "#121212" : "white",
            }}
            className={classNames(
              "w-11/12 lg:w-3/5 flex mb-2 rounded-lg items-center border-2 border-gray-200/60 dark:border-gray-500/20 shadow-md"
            )}
          >
            <textarea
              value={query}
              rows={1}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setQuery(e.target.value)
              }
              placeholder="follow up question..."
              className="w-full p-2 outline-none resize-none font-inherit text-inherit bg-transparent border-none"
            />

            <div className="p-2">
              <IconButton variant="outlined" size="sm" type="submit">
                <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                  <g strokeWidth="0"></g>
                  <g strokeLinecap="round" strokeLinejoin="round"></g>
                  <g>
                    <path
                      d="M11.5003 12H5.41872M5.24634 12.7972L4.24158 15.7986C3.69128 17.4424 3.41613 18.2643 3.61359 18.7704C3.78506 19.21 4.15335 19.5432 4.6078 19.6701C5.13111 19.8161 5.92151 19.4604 7.50231 18.7491L17.6367 14.1886C19.1797 13.4942 19.9512 13.1471 20.1896 12.6648C20.3968 12.2458 20.3968 11.7541 20.1896 11.3351C19.9512 10.8529 19.1797 10.5057 17.6367 9.81135L7.48483 5.24303C5.90879 4.53382 5.12078 4.17921 4.59799 4.32468C4.14397 4.45101 3.77572 4.78336 3.60365 5.22209C3.40551 5.72728 3.67772 6.54741 4.22215 8.18767L5.24829 11.2793C5.34179 11.561 5.38855 11.7019 5.407 11.8459C5.42338 11.9738 5.42321 12.1032 5.40651 12.231C5.38768 12.375 5.34057 12.5157 5.24634 12.7972Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></path>
                  </g>
                </svg>
              </IconButton>
            </div>
          </form>
        </div>
      )}
    </CssVarsProvider>
  );
}
