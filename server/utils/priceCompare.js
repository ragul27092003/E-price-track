const getPriceMatchStatus = (storePrice, competitorPrice, threshold = 20) => {

  const price1 = Number(storePrice);
  const price2 = Number(competitorPrice);

  if (isNaN(price1) || isNaN(price2) || price1 <= 0) {
    return { status : "mismatch" }
  }

  const difference =
    (Math.abs(price1 - price2) / price1) * 100;

  return { status:  difference <= threshold ? "match" : "mismatch" }

};

module.exports = { getPriceMatchStatus };

