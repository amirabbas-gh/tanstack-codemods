import axios from "axios";
import { createFileRoute } from "@tanstack/react-router";

async function ApiPage() {
  const res = await axios.get<{ title: string }>("/api/x");
  console.log(res.status);

  return <main>{res.data.title}</main>;
}

export const Route = createFileRoute("/api")({
  component: ApiPage,
});
