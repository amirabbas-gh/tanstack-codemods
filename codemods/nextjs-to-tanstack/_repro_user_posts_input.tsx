import { POSTS } from "./posts-data";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Image } from '@unpic/react';

type VercelBlogPost = {
  id: number;
  title: string;
  content: string;
  author: string;
  date: string;
  category: string;
};

async function PostsPage() {
  const res = await fetch("https://api.vercel.app/blog", {
    next: { revalidate: 60 },
  });
  const raw = res.ok ? await res.json() : null;
  const apiPosts: VercelBlogPost[] = Array.isArray(raw) ? raw : [];

  return (
    <main className="min-h-dvh w-full max-w-2xl mx-auto flex flex-col gap-8 p-6">
      <header className="space-y-2">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Static route
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Posts</h1>
        <p className="text-neutral-600 dark:text-neutral-300">
          This page is served from{" "}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm dark:bg-neutral-800">
            app/posts/page.tsx
          </code>{" "}
          with no URL params. Thumbnails use{" "}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-sm dark:bg-neutral-800">
            next/image
          </code>
          .
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          Fetched from{" "}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">
            api.vercel.app/blog
          </code>
        </h2>
        {!res.ok ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            Request failed ({res.status}). Could not load remote posts.
          </p>
        ) : apiPosts.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No posts in response.
          </p>
        ) : (
          <ol className="list-decimal space-y-3 pl-5 text-neutral-800 dark:text-neutral-200">
            {apiPosts.map((post) => (
              <li key={post.id} className="space-y-1">
                <p className="font-medium">{post.title}</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {post.author} · {post.date} · {post.category}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-500 line-clamp-2">
                  {post.content}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          Featured posts
        </h2>
        <ul className="flex flex-col gap-5">
          {POSTS.map((post) => (
            <li key={post.slug}>
              <Link
                to={`/posts/${post.slug}`}
                className="group block overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50/80 transition hover:border-neutral-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-950/40 dark:hover:border-neutral-700"
              >
                <div className="relative aspect-video w-full bg-neutral-200 dark:bg-neutral-900">
                  <Image
                    src={post.imageUrl}
                    alt=""
                    
                    sizes="(max-width: 672px) 100vw, 672px"
                    className="object-cover transition duration-300 group-hover:scale-[1.02]"
                    priority={post.slug === POSTS[0]?.slug}
                  />
                </div>
                <div className="space-y-1 p-4">
                  <p className="font-medium text-neutral-900 group-hover:underline dark:text-neutral-100">
                    {post.title}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    {post.description}
                  </p>
                  <p className="font-mono text-xs text-neutral-500 dark:text-neutral-500">
                    /posts/{post.slug}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
          Catch-all segment examples
        </h2>
        <ul className="flex flex-col gap-2">
          <li>
            <Link
              to="/posts/docs/getting-started"
              className="text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
            >
              /posts/docs/getting-started
            </Link>
            <span className="ml-2 text-sm text-neutral-500">
              → [...slug] (multiple segments)
            </span>
          </li>
          <li>
            <Link
              to="/posts/archive/2024/q1"
              className="text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
            >
              /posts/archive/2024/q1
            </Link>
          </li>
        </ul>
      </section>

      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        <Link to="/" className="underline-offset-4 hover:underline">
          ← Home
        </Link>
      </p>
    </main>
  );
}

export const Route = createFileRoute("/posts")({
  component: PostsPage,
});
