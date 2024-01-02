export type Project = {
  name: string;
  description: string;
  links: { name: string; link: string }[];
  link: string;
};

export type Post = {
  title: string;
  date: {
    time: number;
  };
  url: string;
};
