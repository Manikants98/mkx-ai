import { motion } from "framer-motion";
import React, { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface TypewriterMarkdownProps {
  children: string;
  speed?: number;
  className?: string;
}

const TypewriterMarkdown: React.FC<TypewriterMarkdownProps> = ({
  children,
  speed = 10,
  className = "",
}) => {
  const [visibleText, setVisibleText] = useState("");
  const [windowWidth, setWindowWidth] = useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 0
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle responsive typing speed based on screen size
  const getResponsiveSpeed = () => {
    if (windowWidth < 640) {
      return speed * 1.5; // Slower on mobile
    } else if (windowWidth < 1024) {
      return speed * 1.2; // Slightly slower on tablets
    }
    return speed; // Default speed on larger screens
  };

  // Update window width on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  useEffect(() => {
    let index = 0;
    setVisibleText("");
    const responsiveSpeed = getResponsiveSpeed();

    const interval = setInterval(() => {
      setVisibleText(children.slice(0, index + 1));
      index++;
      if (index >= children.length) clearInterval(interval);
    }, responsiveSpeed);

    return () => clearInterval(interval);
  }, [children, speed, windowWidth]);

  return (
    <motion.div
      ref={containerRef}
      className={`${className} w-full overflow-x-auto`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <ReactMarkdown
        components={{
          code({ node, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = props.inline || false;
            return !isInline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus as any}
                language={match[1]}
                PreTag="div"
                className={props.className}
                wrapLines={true}
                customStyle={{
                  maxWidth: "100%",
                  overflowX: "auto",
                  fontSize: windowWidth < 640 ? "0.8rem" : "1rem",
                }}
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code className={`${className} break-words`} {...props}>
                {children}
              </code>
            );
          },
          p: ({ children }) => (
            <p className="whitespace-pre-wrap break-words">{children}</p>
          ),
          img: ({ src, alt }) => (
            <img src={src} alt={alt} className="max-w-full h-auto my-2" />
          ),
        }}
      >
        {visibleText}
      </ReactMarkdown>
    </motion.div>
  );
};

export default TypewriterMarkdown;
