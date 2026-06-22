export const mockClasses = [
  { id: 1, name: "Medical Student 2022" },
  { id: 2, name: "Medical Student 2023" },
];

export const mockQuestions = [
  {
    id: 101,
    subjectId: 1,
    text: "Which bone is the longest in the human body?",
    type: "multiple_choice",
    image: null,
    options: [
      { id: 1, text: "Femur", isCorrect: true },
      { id: 2, text: "Tibia", isCorrect: false },
      { id: 3, text: "Humerus", isCorrect: false },
    ],
  },
  {
    id: 102,
    subjectId: 2,
    text: "Explain the process of Glycolysis.",
    type: "essay",
    image: "glycolysis_pathway.png",
    options: [],
  },
];
