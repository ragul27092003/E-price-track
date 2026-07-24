const getNameMatchStatus = (storeName, competitorName, threshold = 70) => {
  const normalize = (str) =>
    (str || "")
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const name1 = normalize(storeName);
  const name2 = normalize(competitorName);

  if (!name1 || !name2) {
    return { status : "mismatch" };
  }

  const words1 = new Set(name1.split(" "));
  const words2 = new Set(name2.split(" "));

  const commonWords = [...words1].filter((word) => words2.has(word)).length;
  const totalWords = new Set([...words1, ...words2]).size;

  const similarity = (commonWords / totalWords) * 100;

  return { status : similarity >= threshold ? "match" : "mismatch" };
};

module.exports = {
  getNameMatchStatus,
};