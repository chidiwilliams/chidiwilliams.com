import { getAllPosts } from "@/lib/api";
import { getSiteConfig } from "@/lib/config";
import { formatDate } from "@/lib/utils";

export default function Index() {
  const allPosts = getAllPosts();
  const siteConfig = getSiteConfig();
  const recentPosts = allPosts;
  const recentProjects = siteConfig.projects;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 xl:max-w-5xl xl:px-0 pb-12">
      <div className="py-10 space-y-16">
        <header className="space-y-2 sm:space-y-4">
          <h1 className="lg:pt-32 text-2xl leading-9 font-semibold sm:text-3xl sm:leading-10 md:text-4xl md:leading-14">
            Chidi Williams
          </h1>

          <nav>
            <ul className="text-sm flex gap-4 font-sans">
              {siteConfig.socialLinks.map(({ name, link }) => (
                <li key={name}>
                  <a
                    href={link}
                    className="transition-all opacity-80 hover:opacity-100"
                  >
                    {name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Writing</h2>
            <ul className="space-y-7">
              {recentPosts
                .slice(0, Math.ceil(recentPosts.length / 2))
                .map((post) => (
                  <li key={post.slug}>
                    <article>
                      <h3 className="text-lg font-medium">
                        <a href={`/posts/${post.slug}`}>{post.title}</a>
                      </h3>
                      <time className="text-sm opacity-60">
                        {formatDate(new Date(post.date))}
                      </time>
                    </article>
                  </li>
                ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold opacity-0 hidden md:block">
              Writing
            </h2>
            <ul className="space-y-7">
              {recentPosts
                .slice(Math.ceil(recentPosts.length / 2))
                .map((post) => (
                  <li key={post.slug}>
                    <article>
                      <h3 className="text-lg font-medium">
                        <a href={`/posts/${post.slug}`}>{post.title}</a>
                      </h3>
                      <time className="text-sm opacity-60">
                        {formatDate(new Date(post.date))}
                      </time>
                    </article>
                  </li>
                ))}
            </ul>
          </div>

          <div className="space-y-12">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Projects</h2>
              <ul className="space-y-7">
                {recentProjects.map((project) => (
                  <li key={project.name}>
                    <article>
                      <h3 className="text-lg font-medium">
                        <a href={project.link}>{project.name}</a>
                      </h3>
                      <p className="text-sm opacity-80">
                        {project.description}
                      </p>
                    </article>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Talks</h2>
              <ul className="space-y-7">
                {siteConfig.talks.map(({ title, url, date }) => (
                  <li key={title}>
                    <article>
                      <h3 className="text-lg font-medium">
                        <a href={url}>{title}</a>
                      </h3>
                      <time className="text-sm opacity-60">
                        {formatDate(new Date(date))}
                      </time>
                    </article>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
