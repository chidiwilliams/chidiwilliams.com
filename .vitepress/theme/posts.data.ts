import { createContentLoader } from "vitepress";

interface Post {
  title: string;
  url: string;
  date: {
    time: number;
    string: string;
  };
  excerpt: string | undefined;
}

declare const data: Post[];
export { data };

export default createContentLoader("posts/*.md", {
  transform(raw): Post[] {
    return raw
      .filter(({ frontmatter }) => !frontmatter.draft)
      .map(({ url, frontmatter, excerpt }) => {
        return {
          title: frontmatter.title,
          url,
          excerpt: excerpt,
          date: formatDate(frontmatter.date),
        };
      })
      .sort((a, b) => b.date.time - a.date.time);
  },
});

function formatDate(raw: string): Post["date"] {
  const date = new Date(raw);
  date.setUTCHours(12);
  return {
    time: +date,
    string: date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}
