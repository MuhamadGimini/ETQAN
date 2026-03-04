
// services/barcode.ts

/**
 * Generates an SVG string for a barcode (Code 128 B).
 * This is a simplified implementation for alphanumeric characters.
 * @param text The text to encode.
 * @returns SVG XML string.
 */
export const generateBarcodeSVG = (text: string): string => {
    if (!text || typeof text !== 'string' || !/^[A-Za-z0-9\s-]*$/.test(text)) {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 200 50"><text x="10" y="30" fill="red">Invalid Barcode</text></svg>`;
    }
    
    // Code 128 character set (values for checksum)
    const code128B = " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";

    const START_B = 104;
    const STOP = 106;

    // Pattern table for bars and spaces (widths 1-4)
    const patterns = [
        "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", "221312",
        "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", "221231",
        "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", "212123",
        "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", "231113",
        "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", "231131",
        "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", "314111",
        "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", "112412",
        "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", "111242",
        "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", "214121",
        "412121", "111143", "111341", "131141", "111232", "111232", "111232", "111232", "111232", "111232",
        "111232", "111232", "211214", "211412", "211232", "2331112"
    ];

    let checksum = START_B;
    for (let i = 0; i < text.length; i++) {
        const charValue = code128B.indexOf(text[i]);
        checksum += charValue * (i + 1);
    }
    checksum = checksum % 103;

    let pattern = patterns[START_B];
    for (let i = 0; i < text.length; i++) {
        pattern += patterns[code128B.indexOf(text[i])];
    }
    pattern += patterns[checksum];
    pattern += patterns[STOP];

    let svgPath = '';
    let x = 0;
    let isBar = true;

    for (const widthChar of pattern) {
        const width = parseInt(widthChar);
        if (isBar) {
            svgPath += `M${x} 0 V100 H${x + width} V0 Z `;
        }
        x += width;
        isBar = !isBar;
    }

    return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x} 100" preserveAspectRatio="none" width="100%" height="100%">
            <path d="${svgPath}" fill="black" />
        </svg>
    `;
};
