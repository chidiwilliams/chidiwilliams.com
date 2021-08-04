---
title: 'The Tradeoffs We Make'
date: 2021-08-03T12:00:25+01:00
draft: false
url: tradeoffs
images:
  [
    'https://res.cloudinary.com/cwilliams/image/upload/c_crop,h_2088,w_3989,x_500,y_1100/v1628028726/Blog/elena-mozhvilo-j06gLuKK0GM-unsplash.jpg',
  ]
---

Building software is as much about making tradeoffs as it is about writing code. It involves making decisions about what strategies, tools, and processes to use. In a tradeoff, choosing some benefit from an alternative comes at a cost. There are no simple right or wrong answers, only better or worse choices in the context of the requirements and available resources.

One common tradeoff in software engineering is the space-time tradeoff. In some processes, it is possible to reduce computation time by using more memory or disk storage. For example, here's a program that prints out the intersection between two arrays, _m_ and _n_:

```javascript
// Prints all elements that exist in both m and n
function intersection(m, n) {
  // For each element in m...
  for (i = 0; i < m.length; i++) {
    // Check each element in n
    for (j = 0; j < n.length; j++) {
      // If the element exists in both m and n, print the element
      if (m[i] === n[j]) console.log(m[i]);
    }
  }
}

// intersection([1, 5, 2, 9], [5, 4, 9, 0])
// > 5
// > 9
```

This program has a space complexity of _O(1)_ and a time complexity of _O(m\*n)_. But we can improve the runtime complexity by using some more memory:

```javascript
function intersection(m, n) {
  const s = {};

  // Store all elements in m in a map
  for (i = 0; i < m.length; i++) {
    s[m[i]] = true;
  }

  // For each element in n
  for (i = 0; i < n.length; i++) {
    // If the element exists in the map, print the element
    if (s[n[i]]) console.log(n[i]);
  }
}
```

This version has a space complexity of _O(m)_ and a time complexity of _O(m+n)_. By storing the elements in the first array in a map, we reduce the time complexity of the program from quadratic time to linear.

We trade space for time in other ways. For example, we sometimes use caching to store frequently requested data instead of re-querying a database. We can serve client requests more quickly at the cost of the memory of the caches.

![Application caching](https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_750/v1628010158/Blog/4b49a861-2d8f-4c38-9b85-9cd25e892fab.png)

Content Delivery Networks (CDNs) also work as caches. They serve HTML documents, stylesheets, scripts, and media files from a globally distributed network of servers. Instead of sending requests to a single global server, clients send requests to the network. The CDN reduces the time it takes to retrieve a resource at the cost of more storage space.

![Content Delivery Networks](https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_750/v1628011384/Blog/42e81ad0-039a-4c60-98cd-257280579f86.png)

Distributed databases have other tradeoffs. Say we have a single database that stores application data and responds to user queries. We can create "replicas" or secondary nodes of the database and distribute incoming read traffic across the nodes. After the primary node receives a write request, it communicates the changes to all the other nodes.

![Database replication](https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_750/v1628011614/Blog/5361e652-778a-474d-be6e-a29c34b8cc77.png)

But it takes some time for the primary node to communicate those changes. If a client tries to read from a secondary node before the time difference elapses, the client may get stale data.

We have two choices here. The primary node can perform the write request and then respond to the client. Then, it would replicate the changes to the other nodes. In this case, we say that the database does not have _linearizability_. After a successful write request, a secondary node might still return a _stale read_ for some time.

![Latency over linearizability in distributed databases](https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_750/v1628012359/Blog/78afe71c-b04e-4f93-ab9a-bfbcc055ec40.png)

Alternatively, the primary node can wait to replicate the changes in the other nodes before confirming that the write is successful. This configuration would be linearizable. Every read request would return the most up-to-date view of the data from the last successful write request. But the cost would be that write requests take longer to complete.

![Linearizability over latency in distributed databases](https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_750/v1628012725/Blog/52e4e80f-4488-44fb-ae1d-d0c35d7165cf.png)

In these two examples, we assume that the database nodes can communicate with one another. But what happens if they can't? In the event of a network failure—a network _partition_—a disconnected node can't guarantee that its data is up to date.

Again, we have two options. The secondary node can respond with an error. Instead of returning possibly-stale data, the node chooses to be unavailable. Or, the node can favour availability over linearizability and return its current data.

![Linearizability over availability in distributed databases](https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_750/v1628018818/Blog/2b9795e5-cb77-468c-9875-e17e92b86cc5.png)

![Availability over linearizability in distributed databases](https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_750/v1628014104/Blog/51480821-42e8-4456-a59d-58fa156a8fe6.png)

In the event of a partition, the latency-linearizability tradeoff becomes an availability-linearizability tradeoff. Together, these two tradeoffs are formally known as the [PACELC theorem](https://en.wikipedia.org/wiki/PACELC_theorem). The theorem holds that in the event of a network partition (P) in a distributed system, one has to choose between availability (A) and consistency (C), else (E), one has to choose between latency (L) and consistency (C). The PACELC theorem extends the earlier [CAP theorem](https://en.wikipedia.org/wiki/CAP_theorem). CAP only considers the consistency-availability tradeoff in the event of a partition.

In practice, these tradeoffs [aren't as binary](https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html). "Availability" in the CAP/PACELC sense means that every non-failing node returns a response to all requests it receives. But a system that isn't CAP-available may still be available to process requests from other nodes. Similarly, "consistency" in CAP/PACELC only describes one kind of consistency: linearizability. That is, a read request after a successful write must return the latest version of the data. But a network that isn't CAP-consistent can still offer weaker forms of consistency, like [sequential](https://en.wikipedia.org/wiki/Consistency_model#Sequential_consistency) and [causal consistency](https://en.wikipedia.org/wiki/Consistency_model#Causal_consistency).

There are varying levels of availability and consistency, a wide spectrum of possibilities. But the tradeoffs themselves don't disappear. Whichever way we turn, decisions we make about the consistency of distributed networks affect latency and availability and vice-versa.

Another common tradeoff in software engineering is the one between performance and ease of use. To make systems more user-friendly, we write abstractions that sometimes worsen performance. For example, high-level languages (like Python) are easier to use than lower-level languages (like C). But the benefit sometimes comes at the cost of program speed.

Building useful software requires being thoughtful about making good tradeoffs. It takes a deep understanding of the requirements, constraints, resources, and the pros and cons of the alternatives. While making these decisions, we should ask: What do users expect from this application? Strong consistency could be critical for a financial application. But, for a blog? Probably not. We should also find out what resources are available and how to use them to get the results we want. The space-time tradeoffs we made earlier were reasonable because memory was readily available.

Using precise language clears the path towards making better decisions. Instead of saying an alternative is simply "faster" or "more reliable", use more descriptive terms. Be less vague. "Faster" by how much? By how many seconds? Or by what percentage? "More reliable" under what conditions?

Vague descriptions can hide the full scope and impact of choosing certain alternatives. An option might perform abysmally under certain important conditions even though it performs well on average. In ancient folklore, knowing the _true name_ of a being gave you complete control over it. The mytheme rings true here. As we ask more probing questions to uncover the full impact of a tradeoff—its _true name_—we gain more control over the overall decision.

Learning to make thoughtful tradeoffs is also a key part of becoming a technical leader. Good engineering leadership involves understanding the context behind engineering decisions and re-evaluating the decisions when requirements change. As [the memes](https://twitter.com/sugarpirate_/status/1348044775887233024) say: becoming a senior engineer is saying "it depends" over and over again until you retire.

In any case, making good tradeoffs is a skill every software engineer should learn. These decisions make significant differences. And thinking about them carefully helps ensure that we build software that remains valuable to users.
