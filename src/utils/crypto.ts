import { Buffer } from 'buffer';
import { CRYPTO_KEY, IV } from '../constants/string';

// **AES-CBC 加密**
export const encrypt = async (text: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        CRYPTO_KEY,
        { name: "AES-CBC" },
        false,
        ["encrypt"]
    );

    // **加密**
    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: "AES-CBC", iv: IV },
        cryptoKey,
        data
    );

    // **Base64 编码**
    return Buffer.from(encryptedBuffer).toString('base64');
};

// **AES-CBC 解密**
export const decrypt = async (encryptedText: string): Promise<string> => {
    // **Base64 解码**
    const encryptedBuffer = Uint8Array.from(Buffer.from(encryptedText, 'base64'));

    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        CRYPTO_KEY,
        { name: "AES-CBC" },
        false,
        ["decrypt"]
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-CBC", iv: IV },
        cryptoKey,
        encryptedBuffer
    );

    // **移除填充的 0**
    return new TextDecoder().decode(decryptedBuffer).replace(/\0+$/, '');
};
