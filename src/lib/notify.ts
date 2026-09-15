import { Alert, Platform } from "react-native";

/** Alert.alert n'existe pas sur react-native-web : on retombe sur window.alert. */
export function notify(title: string, message?: string) {
  if (Platform.OS === "web") {
    // eslint-disable-next-line no-alert
    window.alert(message ? title + "\n\n" + message : title);
    return;
  }
  Alert.alert(title, message);
}
