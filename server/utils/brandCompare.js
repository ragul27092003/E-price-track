const getBrandMatchStatus = (storeBrand, competitorBrand) => {

  const brand1 = (storeBrand || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();

  const brand2 = (competitorBrand || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();

  if (!brand1 || !brand2) {
    return { status: "mismatch" }
  }

  if (
    brand1 === brand2 ||
    brand1.includes(brand2) ||
    brand2.includes(brand1)
  ) {
    return { status: "match" }
  }

  return { status: "mismatch" }
};

module.exports = {
  getBrandMatchStatus,
};