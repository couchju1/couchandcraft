const crypto = require("crypto");

const code = 'document.documentElement.className = "js";';

module.exports = {
  code,
  hash: `sha256-${crypto.createHash("sha256").update(code).digest("base64")}`,
};
