import { z } from "../../_i18n_depth_check";
import { createFileRoute } from '@tanstack/react-router';

function AboutPage() {
  return <div>about {z}</div>;
}

export const Route = createFileRoute("/{-$locale}/about")({
  component: AboutPage,
});
