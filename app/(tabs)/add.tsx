import { Redirect } from "expo-router";

export default function AddTabRedirect() {
  return <Redirect href={{ pathname: "/add-transaction", params: { type: "expense" } }} />;
}
