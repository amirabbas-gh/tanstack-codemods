import axios from "axios";
import { createFileRoute } from "@tanstack/react-router";

function ApiPage() {
  const res = Route.useLoaderData();

  return <main>{res.data.title}</main>;
}

export const Route = createFileRoute("/api")({
  component: ApiPage,

  loader: async () => {
    const res = await axios.get<{ title: string }>("/api/x");
    console.log(res.status);
    return res;
  },
});
