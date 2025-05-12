// import llama3Tokenizer from "llama3-tokenizer-js";

export const cleanedText = (text: string) => {
  let newText = text
    .trim()
    .replace(/(\n){4,}/g, "\n\n\n")
    .replace(/\n\n/g, " ")
    .replace(/ {3,}/g, "  ")
    .replace(/\t/g, "")
    .replace(/\n+(\s*\n)*/g, "\n")
    .substring(0, 100000);

  // console.log(llama3Tokenizer.encode(newText).length);

  return newText;
};

export async function fetchWithTimeout(
  url: string,
  options = {},
  timeout = 3000
) {
  // Create an AbortController
  const controller = new AbortController();
  const { signal } = controller;

  // Set a timeout to abort the fetch
  const fetchTimeout = setTimeout(() => {
    controller.abort();
  }, timeout);

  // Start the fetch request with the abort signal
  return fetch(url, { ...options, signal })
    .then((response) => {
      clearTimeout(fetchTimeout); // Clear the timeout if the fetch completes in time
      return response;
    })
    .catch((error) => {
      if (error.name === "AbortError") {
        throw new Error("Fetch request timed out");
      }
      throw error; // Re-throw other errors
    });
}

type suggestionType = {
  id: number;
  name: string;
  icon: string;
};

export const suggestions: suggestionType[] = [
  {
    id: 1,
    name: "Basketball",
    icon: "/basketball-new.svg",
  },
  {
    id: 2,
    name: "Machine Learning",
    icon: "/light-new.svg",
  },
  {
    id: 3,
    name: "Personal Finance",
    icon: "/finance.svg",
  },
  {
    id: 4,
    name: "U.S History",
    icon: "/us.svg",
  },
];

export const getSystemPrompt = (
  finalResults: { fullContent: string }[],
  ageGroup: string,
  interaction: string
) => {
  let learner_level =
    "The learner here is a student of high school between the age of 15 and 18 years";
  if (ageGroup.toLowerCase() == "preschool") {
    learner_level =
      "The learner here is a preschool student of age between 3 and 6 years";
  } else if (ageGroup.toLowerCase() == "elementary-school") {
    learner_level =
      "The learner here is a student of elementary school between the age of 6 and 12 years";
  } else if (ageGroup.toLowerCase() == "middle-school") {
    learner_level =
      "The learner here is a student of middle school between the age of 12 and 15 years";
  } else if (ageGroup.toLowerCase() == "high-school") {
    learner_level =
      "The learner here is a student of high school between the age of 15 and 18 years";
  } else if (ageGroup.toLowerCase() == "undergraduate") {
    learner_level =
      "The learner here is an undergraduate student who has completed basic school education and is of the age more than 18 years";
  } else if (ageGroup.toLowerCase() == "graduate") {
    learner_level =
      "The learner here is an graduate student who has completed school and college and is of the age more than 21 years";
  }
  let next_action = "Do not quiz or ask any question. Only give your answer.";
  if (interaction == "none" || interaction == "" || interaction == null) {
    next_action = "Do not quiz or ask any question. Only give your answer.";
  } else if (interaction == "converse") {
    next_action =
      "Give options to explore more related topics in detail or offer to explore some of the areas in your answer further. And then ask them what they want to learn about (in markdown numbers).";
  } else if (interaction == "quiz") {
    next_action =
      "Based on your answer, ask a question from that content to test the knowledge of learner. The answer must be within the response you have provided. If the age of the learner is more than 15 then you will ask a difficult question. If the answer is correct then you will congraulate the learner of good understanding. If the answer is incorrect then politely inform the learner about it and ask another question.";
  } else if (interaction == "random") {
    next_action =
      "You can choose to ask a simple question to test the knowledge of learner OR give more options to explore details of related topics by listing them (in markdown numbers) OR you may choose to do nothing after you have given your answer.";
  }

  return `
  You are a professional interactive personal tutor who is an expert at explaining topics to student as a teacher. Given a topic and the information to teach, please educate the user about it, who is a student. ${learner_level}. ${next_action} Start by greeting the learner, giving them a short overview of the topic, and then ask them what they want to learn about (in markdown numbers). Be interactive throughout the chat and quiz the user occasionally after you teach them material. Do not quiz them in the first overview message and make the first message short and concise.

  Right now the information to teach the student is about ===

  <teaching_info>
  ${"\n"}
  ${finalResults
    .slice(0, 7)
    .map(
      (result, index) => `## Webpage #${index}:\n ${result.fullContent} \n\n`
    )}
  </teaching_info>

  ===

  Please return answer in markdown. It is very important for my career that you follow these instructions. Here is the topic to educate on:
    `;
};
