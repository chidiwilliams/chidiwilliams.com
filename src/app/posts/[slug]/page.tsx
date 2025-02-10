import { getAllPosts, getPostBySlug } from "@/lib/api";
import markdownToHtml from "@/lib/markdownToHtml";
import { formatDate } from "@/lib/utils";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export default async function Post(props: Params) {
  const params = await props.params;
  const post = getPostBySlug(params.slug);

  if (!post) {
    return notFound();
  }

  const content = await markdownToHtml(post.content || "");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 xl:max-w-5xl xl:px-0 pb-12">
      <header className="py-10">
        <h1>
          <a
            href="/"
            className="mt-1 text-sm gap-6 transition-all opacity-80 hover:opacity-100"
          >
            ← Home
          </a>
        </h1>
      </header>

      <main>
        <article className="prose">
          <header className="pt-6 xl:pb-10 space-y-2">
            <h1 className="text-2xl font-extrabold sm:text-4xl md:text-5xl m-0">
              {post.title}
            </h1>
            <time className="text-sm opacity-60">
              {formatDate(new Date(post.date))}
            </time>
          </header>

          <div className="divide-y xl:divide-y-0 divide-neutral-200">
            <div className="divide-y divide-neutral-200 xl:pb-0 xl:col-span-3 xl:row-span-2">
              <div dangerouslySetInnerHTML={{ __html: content }} />
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata(props: Params): Promise<Metadata> {
  const params = await props.params;
  const post = getPostBySlug(params.slug);

  if (!post) {
    return notFound();
  }

  const title = `${post.title} | Chidi Williams`;

  return {
    title,
    openGraph: {
      title,
    },
  };
}

export async function generateStaticParams() {
  const posts = getAllPosts();

  return posts.map((post) => ({
    slug: post.slug,
  }));
}
