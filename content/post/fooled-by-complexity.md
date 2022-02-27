---
title: 'Fooled by Complexity'
date: 2021-11-21T20:06:15Z
draft: false
thumbnail: 'https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_300/v1637524489/Blog/lieborf03.webp'
images:
  ['https://res.cloudinary.com/cwilliams/image/upload/v1637524489/Blog/lieborf03.webp']
aliases: [/newsletter/archive/fooled-by-complexity]
categories: [programming-essays]
---

I enjoy writing software best when I fully appreciate why it exists.

When I'm writing software for myself, this _why_ could be "to learn how to use a new tool", "to share some knowledge I have", "to build a hobby project", or even "just for fun". When I'm writing professionally, it could be "to solve a user's need" or "to make some process easier".

Knowing why I'm writing software saves me from wasting time and effort. When I'm building a hobby project or writing code for fun, I know I can [spend as much time I want exploring different tools and techniques](https://twitter.com/chidiwilliams__/status/1428097210269552649). But in a professional setting, I know to aim for effectiveness (what would be the best way to solve this problem?).

But software is complex, and complexity can be deceptive. To perform some task, it often feels like there can be an infinite number of tools and methods to use—and an infinite number of ways to combine them. And working on difficult, complicated tasks can feel like progress even when it's not.

This may be one reason, if not the main reason, for over-engineering. Building complicated software can feel rewarding in itself. Navigating complexity can feel _good_. But if your goal is to solve a user's need, your multi-cluster, parallelized, auto-scaling, quantum architecture is only one way—and maybe not the only way—to achieve that goal. It's not the goal itself.

I once worked in a small team where the team lead had split the codebase into several [Netflix](https://www.youtube.com/watch?v=CZ3wIuvmHeM)- and [Monzo](https://www.youtube.com/watch?v=t7iVCIYQbgk)-style micro-services. Everyone else on the team felt the architecture was frustrating to work with, but we couldn't change it. Not because of the time and effort it would take to rewrite. But because the lead seemed to value the complexity of the design over its effectiveness.

The old Greek myths tell the story of the Sirens: cunning creatures that lured sailors to shipwreck with their charming song. Jason and his crew passed by the island of the Sirens on their journey on the _Argo_. But fortunately, the crew had with them the talented musician Orpheus, who drowned out the Sirens' song with his even more beautiful song.

Like the Sirens, complexity can sometimes distract us away from our actual reasons for writing software. But Orpheus' song reminds us that, even when it's beautiful and intricate, [don't fall in love with your technology](https://prog21.dadgum.com/128.html).

— Chidi

(Last week, I published a [blog post](https://chidiwilliams.com/post/text-search-with-tries/) on the trie, a tree data structure used for free-text search, auto-complete and other text-based operations. I found its application in [DNA sequencing](https://www.youtube.com/watch?v=9U0ynguwoNA) especially interesting.)
