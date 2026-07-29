const crypto = require("crypto");

const ALGORITHM = "aes-256-cbc";
const SECRET_KEY = crypto
  .createHash("sha256")
  .update(process.env.ENCRYPTION_KEY)
  .digest(); // 32 bytes

const IV_LENGTH = 16;

exports.encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return iv.toString("hex") + ":" + encrypted;
};

exports.decrypt = (encryptedText) => {
  const parts = encryptedText.split(":");

  const iv = Buffer.from(parts.shift(), "hex");
  const encrypted = parts.join(":");

  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};