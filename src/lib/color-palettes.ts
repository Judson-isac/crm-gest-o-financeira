
export const palettes = {
  vibrant: {
    name: "Vibrante",
    colors: [
      "hsl(348, 83%, 61%)", // Red
      "hsl(207, 82%, 59%)", // Blue
      "hsl(45, 100%, 51%)", // Yellow
      "hsl(139, 58%, 52%)", // Green
      "hsl(283, 76%, 56%)", // Purple
    ],
  },
  blue: {
    name: "Tons de Azul (CRM)",
    colors: [
      "hsl(217, 90%, 80%)",
      "hsl(217, 90%, 70%)",
      "hsl(217, 90%, 60%)",
      "hsl(217, 90%, 50%)",
      "hsl(217, 90%, 40%)",
    ],
  },
  sunset: {
    name: "Pôr do Sol",
    colors: [
      "hsl(24, 96%, 63%)", // Orange
      "hsl(33, 91%, 68%)", // Lighter Orange
      "hsl(5, 80%, 62%)",  // Red-Orange
      "hsl(320, 68%, 65%)",// Pink
      "hsl(260, 80%, 60%)", // Purple
    ],
  },
  forest: {
    name: "Floresta",
    colors: [
        "hsl(139, 58%, 42%)", // Dark Green
        "hsl(139, 48%, 62%)", // Light Green
        "hsl(88, 36%, 53%)", // Lime Green
        "hsl(45, 60%, 51%)", // Gold
        "hsl(28, 69%, 63%)", // Brown
    ],
  },
};

export type PaletteName = keyof typeof palettes;
