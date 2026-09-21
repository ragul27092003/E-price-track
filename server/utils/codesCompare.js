const axios = require("axios");
const cheerio = require("cheerio");

const getCodesStatus = async (
  eanId,
  productCode,
  productMpn,
  productUrl
) => {
  const result = {
    ean: "mismatch",
    code: "mismatch",
    mpn: "mismatch",
  };

  try {
    if (!productUrl) {
      return result;
    }

    const response = await axios.get(productUrl, {
      timeout: 20000,

      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/140.0.0.0 Safari/537.36",

        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9," +
          "image/avif,image/webp,image/apng,*/*;q=0.8",

        "Accept-Language":
          "en-US,en;q=0.9",

        "Cache-Control": "no-cache",

        Pragma: "no-cache",

        Referer: "https://www.google.com/",

        "Sec-Ch-Ua":
          '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',

        "Sec-Ch-Ua-Mobile": "?0",

        "Sec-Ch-Ua-Platform": '"Windows"',

        "Sec-Fetch-Dest": "document",

        "Sec-Fetch-Mode": "navigate",

        "Sec-Fetch-Site": "cross-site",

        "Sec-Fetch-User": "?1",

        Upgrade: "1",
      },
    });

    const html = response.data;

    const $ = cheerio.load(html);

    // Complete HTML / View Source
    const pageSource = $.html();

    // --------------------------------
    // EAN
    // --------------------------------
    if (
      eanId &&
      pageSource.includes(String(eanId))
    ) {
      result.ean = "match";
    }

    // --------------------------------
    // Product Code
    // --------------------------------
    if (
      productCode &&
      pageSource.includes(String(productCode))
    ) {
      result.code = "match";
    }

    // --------------------------------
    // MPN
    // --------------------------------
    if (
      productMpn &&
      pageSource.includes(String(productMpn))
    ) {
      result.mpn = "match";
    }

    return result;

  } catch (error) {
    console.error(
      `[Code Check] ${productUrl} -> ${error.response?.status || error.message}`
    );

    return {
      ean: "error",
      code: "error",
      mpn: "error",
    };
  }
};

module.exports = {
  getCodesStatus,
};
