const { imageHash } = require("image-hash");

function getHash(imageUrl) {
  return new Promise((resolve, reject) => {
    imageHash(imageUrl, 16, true, (err, hash) => {
      if (err) return reject(err);
      resolve(hash);
    });
  });
}

function hammingDistance(str1, str2) {
  let distance = 0;

  for (let i = 0; i < Math.min(str1.length, str2.length); i++) {
    if (str1[i] !== str2[i]) {
      distance++;
    }
  }

  return distance + Math.abs(str1.length - str2.length);
}

async function compareImages(img1, img2) {
  try {
    const hash1 = await getHash(img1);
    const hash2 = await getHash(img2);

    const distance = hammingDistance(hash1, hash2);

    const similarity = Math.round(
      ((hash1.length - distance) / hash1.length) * 100
    );

    return {
      hash1,
      hash2,
      distance,
      similarity,
      status: similarity >= 90 ? "match" : "mismatch",
    };
  } catch (err) {
    console.error("Image compare error:", err);

    return {
      similarity: 0,
      status: "mismatch",
    };
  }
}

module.exports = { compareImages };