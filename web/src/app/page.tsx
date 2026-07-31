import { redirect } from "next/navigation";

// TODO: replace with a real check against the Go API once project
// endpoints exist — for now this always sends to the projects list
export default function RootPage() {
  redirect("/projects");
}
