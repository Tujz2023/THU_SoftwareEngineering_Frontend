/**
 * @note 本文件是一个字符串常量文件的示例，较长的常量字符串，如各类提示文字，均可以写在这里
 *       这么做可以提高核心代码可读性，不会因为过长的字符串导致主逻辑代码难以分析
 */

export const BACKEND_URL = "";

export const FAILURE_PREFIX = "网络请求失败：";

export const LOGIN_REQUIRED = "你需要登陆才能完成这一操作";
export const LOGIN_SUCCESS_PREFIX = "登陆成功，用户名：";
export const LOGIN_FAILED = "登陆失败";

export const CRYPTO_KEY = new TextEncoder().encode("/Fz7Ta1nLj9wQiuJ");
export const IV = new Uint8Array(16).fill(0);