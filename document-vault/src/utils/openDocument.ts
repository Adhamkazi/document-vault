import * as WebBrowser from "expo-web-browser";

export async function openDocument(uri: string) {
  await WebBrowser.openBrowserAsync(uri);
}