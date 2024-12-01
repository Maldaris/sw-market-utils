export type RGB = [number, number, number];

export class ColorFormattingCode {

  static [key: string]: any;
  readonly formatCode: string;
  readonly foreRgb: RGB;
  readonly foreHex: string;
  readonly backRgb: RGB;
  readonly backHex: string;

  private constructor(formatCode: string, foreRgb: RGB, foreHex: string, backRgb: RGB, backHex: string) {
    this.formatCode = formatCode;
    this.foreRgb = foreRgb;
    this.foreHex = foreHex;
    this.backRgb = backRgb;
    this.backHex = backHex;
  }

  static readonly black = new ColorFormattingCode("§0", [0, 0, 0], "#000000", [0, 0, 0], "#000000");
  static readonly darkBlue = new ColorFormattingCode("§1", [0, 0, 170], "#0000AA", [0, 0, 42], "#00002A");
  static readonly darkGreen = new ColorFormattingCode("§2", [0, 170, 0], "#00AA00", [0, 42, 0], "#002A00");
  static readonly darkAqua = new ColorFormattingCode("§3", [0, 170, 170], "#00AAAA", [0, 42, 42], "#002A2A");
  static readonly darkRed = new ColorFormattingCode("§4", [170, 0, 0], "#AA0000", [42, 0, 0], "#2A0000");
  static readonly darkPurple = new ColorFormattingCode("§5", [170, 0, 170], "#AA00AA", [42, 0, 42], "#2A002A");
  static readonly gold = new ColorFormattingCode("§6", [255, 170, 0], "#FFAA00", [42, 42, 0], "#2A2A00");
  static readonly gray = new ColorFormattingCode("§7", [170, 170, 170], "#AAAAAA", [42, 42, 42], "#2A2A2A");
  static readonly darkGray = new ColorFormattingCode("§8", [85, 85, 85], "#555555", [21, 21, 21], "#151515");
  static readonly blue = new ColorFormattingCode("§9", [85, 85, 255], "#5555FF", [21, 21, 63], "#15153F");
  static readonly green = new ColorFormattingCode("§a", [85, 255, 85], "#55FF55", [21, 63, 21], "#153F15");
  static readonly aqua = new ColorFormattingCode("§b", [85, 255, 255], "#55FFFF", [21, 63, 63], "#153F3F");
  static readonly red = new ColorFormattingCode("§c", [255, 85, 85], "#FF5555", [63, 21, 21], "#3F1515");
  static readonly lightPurple = new ColorFormattingCode("§d", [255, 85, 255], "#FF55FF", [63, 21, 63], "#3F153F");
  static readonly yellow = new ColorFormattingCode("§e", [255, 255, 85], "#FFFF55", [63, 63, 21], "#3F3F15");
  static readonly white = new ColorFormattingCode("§f", [255, 255, 255], "#FFFFFF", [63, 63, 63], "#3F3F3F");
  static readonly minecoinGold = new ColorFormattingCode("§g", [221, 214, 5], "#DDD605", [55, 53, 1], "#373501");
  static readonly materialQuartz = new ColorFormattingCode("§h", [227, 212, 209], "#E3D4D1", [56, 53, 52], "#383534");
  static readonly materialIron = new ColorFormattingCode("§i", [206, 202, 202], "#CECACA", [51, 50, 50], "#333232");
  static readonly materialNetherite = new ColorFormattingCode("§j", [68, 58, 59], "#443A3B", [17, 14, 14], "#110E0E");
  static readonly materialRedstone = new ColorFormattingCode("§m", [151, 22, 7], "#971607", [37, 5, 1], "#250501");
  static readonly materialCopper = new ColorFormattingCode("§n", [180, 104, 77], "#B4684D", [45, 26, 19], "#2D1A13");
  static readonly materialGold = new ColorFormattingCode("§p", [222, 177, 45], "#DEB12D", [55, 44, 11], "#372C0B");
  static readonly materialEmerald = new ColorFormattingCode("§q", [17, 160, 54], "#47A036", [4, 40, 13], "#04280D");
  static readonly materialDiamond = new ColorFormattingCode("§s", [44, 186, 168], "#2CBAA8", [11, 46, 42], "#0B2E2A");
  static readonly materialLapis = new ColorFormattingCode("§t", [33, 73, 123], "#21497B", [8, 18, 30], "#08121E");
  static readonly materialAmethyst = new ColorFormattingCode("§u", [154, 92, 198], "#9A5CC6", [38, 23, 49], "#261731");

  private static colorDistance(rgb1: RGB, rgb2: RGB): number {
    return Math.sqrt(
      Math.pow(rgb1[0] - rgb2[0], 2) +
      Math.pow(rgb1[1] - rgb2[1], 2) +
      Math.pow(rgb1[2] - rgb2[2], 2)
    );
  }
  
  static nearestFormattingCode(color: string | RGB): ColorFormattingCode {
    const rgb = typeof color === 'string' ? ColorFormattingCode.hexToRgb(color) : color;
    let nearestCode: ColorFormattingCode = ColorFormattingCode.black;
    let minDistance = Infinity;
  
    for (const key in ColorFormattingCode) {
      if (ColorFormattingCode[key] instanceof ColorFormattingCode) {
        const code = ColorFormattingCode[key] as ColorFormattingCode;
        const distance = ColorFormattingCode.colorDistance(rgb, code.foreRgb);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCode = code;
        }
      }
    }
  
    return nearestCode;
  }
  
  private static hexToRgb(hex: string): RGB {
    const bigint = parseInt(hex.startsWith('#') ? hex.slice(1): hex, 16);
    return [
      (bigint >> 16) & 255,
      (bigint >> 8) & 255,
      bigint & 255
    ];
  }
}

export class SpecialFormattingCode {
  static [key: string]: any;
  readonly code: string;
  readonly key: string;
  readonly ansiEscape: string;
  readonly bedrock: string;
  readonly java: string;

  private constructor(code: string, key: string, ansiEscape: string, bedrock: string, java: string) {
    this.code = code;
    this.key = key;
    this.ansiEscape = ansiEscape;
    this.bedrock = bedrock;
    this.java = java;
  }

  static readonly obfuscated = new SpecialFormattingCode("§k", "obfuscated/MTS*", "\e[8m", "Yes", "Yes");
  static readonly bold = new SpecialFormattingCode("§l", "bold", "\e[1m", "Yes", "Yes");
  static readonly strikethrough = new SpecialFormattingCode("§m", "strikethrough", "\e[9m", "No[1]", "Yes");
  static readonly underline = new SpecialFormattingCode("§n", "underline", "\e[4m", "No[1]", "Yes");
  static readonly italic = new SpecialFormattingCode("§o", "italic", "\e[3m", "Yes", "Yes");
  static readonly reset = new SpecialFormattingCode("§r", "reset", "\e[0m", "Yes", "Yes");
  static readonly resetWithColor = new SpecialFormattingCode("§r§f", "reset + add a color", "\e[0m", "Yes", "N/A");
}

export default { ColorFormattingCode, SpecialFormattingCode };