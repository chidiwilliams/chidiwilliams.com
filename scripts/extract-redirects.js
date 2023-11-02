import frontmatter from "frontmatter";
import { readFileSync, readdirSync } from "fs";

const files = readdirSync("posts", {});
files.forEach((path) => {
  const content = readFileSync("posts" + "/" + path, "utf-8").toString();
  const fm = frontmatter(content);
  const { data } = fm;
  if (data.slug) {
    console.log(
      "/post/" + data.slug,
      "/posts/" + path.slice(0, path.length - 3),
      301
    );
  }

  if (data.aliases) {
    data.aliases.forEach((alias) => {
      console.log(alias, "/posts/" + path.slice(0, path.length - 3), 301);
    });
  }
});

console.log("/post/*", "/posts/:splat", 301);
