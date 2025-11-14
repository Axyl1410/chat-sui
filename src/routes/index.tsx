import { createFileRoute } from "@tanstack/react-router";
import { ChatApp } from "../ChatApp";

export const Route = createFileRoute("/")({
  component: ChatApp,
});
