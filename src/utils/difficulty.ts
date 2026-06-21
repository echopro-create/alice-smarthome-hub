export const getDifficultyLabel = (diff?: "easy" | "medium" | "hard") => {
	switch (diff) {
		case "easy":
			return "Легко";
		case "medium":
			return "Средне";
		case "hard":
			return "Сложно";
		default:
			return "";
	}
};
