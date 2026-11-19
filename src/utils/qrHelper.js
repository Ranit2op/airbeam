const QRCode = require('./QRCode');
const QRErrorCorrectLevel = require('./QRCode/QRErrorCorrectLevel');

function getBestTypeNumber(textLength) {
  if (textLength <= 14) return 1;
  if (textLength <= 26) return 2;
  if (textLength <= 42) return 3;
  if (textLength <= 62) return 4;
  if (textLength <= 84) return 5;
  if (textLength <= 106) return 6;
  return 7;
}

export function generateQRCode(text) {
  try {
    const typeNum = getBestTypeNumber(text.length);
    const qr = new QRCode(typeNum, QRErrorCorrectLevel.M);
    qr.addData(text);
    qr.make();

    const count = qr.getModuleCount();
    const matrix = [];

    for (let r = 0; r < count; r++) {
      const row = [];
      for (let c = 0; c < count; c++) {
        row.push(qr.isDark(r, c));
      }
      matrix.push(row);
    }

    return {
      count,
      matrix,
    };
  } catch (err) {
    console.error('Failed to generate QR:', err);
    return null;
  }
}
