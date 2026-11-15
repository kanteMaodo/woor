import QRCode from "qrcode";

/**
 * QR code d'une facture, en SVG, fabriqué sur le serveur : aucune bibliothèque envoyée au téléphone.
 * La facture passe en majuscules, ce qui permet un mode QR plus dense, donc un code plus petit.
 */
export function invoiceQrSvg(bolt11: string): Promise<string> {
  return QRCode.toString(`lightning:${bolt11}`.toUpperCase(), {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#14213D", light: "#FFFFFF" },
  });
}
