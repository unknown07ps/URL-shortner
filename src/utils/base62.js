const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

function encode(num) {
  if (num === 0) return '0';

  let s = '';
  while (num > 0) {
    s = alphabet[num % 62] + s;  // prepend Base62 digit
    num = Math.floor(num / 62);
  }

  return s;
}

module.exports = { encode };
