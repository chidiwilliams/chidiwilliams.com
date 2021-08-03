---
title: 'The Tradeoffs We Make'
date: 2021-08-03T12:00:25+01:00
draft: false
url: tradeoffs
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

This version has a space complexity of _O(m)_ and a time complexity of _O(m+n)_. By using a map to store the values in the first array, we reduce the time complexity of the program from quadratic time to linear.

We trade space for time in other ways. For example, we sometimes use caching to store frequently requested data instead of re-querying a database. We can serve client requests more quickly at the cost of the memory of the caches.

![Application caching](https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_750/v1628010158/Blog/4b49a861-2d8f-4c38-9b85-9cd25e892fab.png)

Content Delivery Networks (CDNs) also work as caches. They serve HTML documents, stylesheets, scripts, and media files from a globally distributed network of servers. Clients make requests to the network instead of making requests to a single global server. The network reduces the time it takes to retrieve a resource at the cost of more storage space.

![Content Delivery Networks](https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_750/v1628011384/Blog/42e81ad0-039a-4c60-98cd-257280579f86.png)

Distributed databases have other tradeoffs. Say we have a single database that stores application data and responds to user queries. We can create "replicas" or secondary nodes of the database and distribute incoming read traffic across the nodes. After the primary node receives a write request, it communicates the changes to all the other nodes.

![Database replication](https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_750/v1628011614/Blog/5361e652-778a-474d-be6e-a29c34b8cc77.png)

But it takes some time for the primary node to communicate those changes. If a client tries to read from a secondary node before the time difference elapses, the client may get stale data.

We have two choices here. The primary node can perform the write request, respond to the client that the write is successful, and then replicate the changes to the other nodes. In this case, we say that the database does not have _linearizability_. After a successful write request, a secondary node might still return a _stale read_ for some time.

![Latency over linearizability in distributed databases](https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_750/v1628012359/Blog/78afe71c-b04e-4f93-ab9a-bfbcc055ec40.png)

Alternatively, the primary node can wait to replicate the changes in the other nodes before confirming that the write is successful. This configuration would be linearizable. Every read request would return the most up-to-date view of the data from the last successful write request. But the cost would be that write requests take longer to complete.

![Linearizability over latency in distributed databases](https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_750/v1628012725/Blog/52e4e80f-4488-44fb-ae1d-d0c35d7165cf.png)

In these two examples, we assume that the database nodes can communicate with one another. But what happens if they aren't? In the event of a network failure—a network _partition_—a disconnected node can't guarantee that its data is up to date.

Again, we have two options. The first is that the secondary node can respond with a timeout or an error. Instead of breaking linearizability by returning possibly-stale data, the node opts to be unavailable. Alternatively, the node can favour availability over linearizability and return its current data.

![Availability over linearizability in distributed databases](https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_750/v1628014104/Blog/51480821-42e8-4456-a59d-58fa156a8fe6.png)

![Linearizability over availability in distributed databases](https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_750/v1628018818/Blog/2b9795e5-cb77-468c-9875-e17e92b86cc5.png)

In the event of a partition, the tradeoff between latency and linearizability becomes a tradeoff between availability and linearizability. Together, these two tradeoffs are formally known as the [PACELC theorem](https://en.wikipedia.org/wiki/PACELC_theorem). The theorem holds that in the event of a network partition (P) in a distributed system, one has to choose between availability (A) and consistency (C), else (E), one has to choose between latency (L) and consistency (C). The PACELC theorem is an extension of the earlier [CAP theorem](https://en.wikipedia.org/wiki/CAP_theorem), which only considers the availability-consistency tradeoff in the event of a partition.

In practice, these tradeoffs [aren't as simple](https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html). Availability in the CAP/PACELC sense means that every request received by a node in the network must result in a non-error response. But a system that is not CAP-available may still be available to process requests from other nodes. Similarly, consistency in the CAP/PACELC framework only describes one kind of consistency: linearizability. That is, a read request after a successful write must return the most up-to-date value of the data. But a non-CAP-consistent system can still offer weaker forms of consistency, like [sequential](https://en.wikipedia.org/wiki/Consistency_model#Sequential_consistency) and [causal consistency](https://en.wikipedia.org/wiki/Consistency_model#Causal_consistency).

There are varying levels of availability and consistency, a wide spectrum of possibilities. But the tradeoffs themselves don't disappear. Whichever way we turn, decisions we make about the consistency of distributed networks affect latency and availability and vice-versa.

Another common tradeoff in software engineering is the one between performance and ease of use. To make systems easier to use, we sometimes write abstractions that negatively affect performance. For example, high-level languages (like Python and JavaScript) are easier to use than lower-level languages (like C) because of the abstractions they provide. But the benefits usually come at the cost of performance.

Building useful software requires being thoughtful about making good tradeoffs. It involves a deep understanding of the requirements, constraints, resources, and the pros and cons of the alternatives. While making these decisions, we should ask: What resources are available? And how can we use them to deliver the results we want? The space-time tradeoffs we made earlier, for example, were justified because "space" as a resource was readily available.

Using precise language also clears the path towards making better decisions. Instead of saying that one alternative is simply "faster" or "more reliable" than the other, use more qualitative and quantitative descriptions. Be less vague. "Faster" by how much? By how many seconds? Or by what percentage? "More reliable" under what conditions?

Vague descriptions can hide the full scope and impact of choosing certain alternatives. An option might perform abysmally under certain important conditions even though it performs well on average. In ancient folklore, knowing the _true name_ of a being gave you complete control over it. The mytheme rings true here. As we ask more probing questions to uncover the overall impact of a tradeoff—its _true name_—we gain more control over the decision.

Learning to make thoughtful tradeoffs is also a key part of becoming a technical leader. Good engineering leadership involves understanding the context behind engineering decisions, communicating the impact to the team and other stakeholders, and re-evaluating the decisions when requirements change. As [the memes](https://twitter.com/sugarpirate_/status/1348044775887233024) go: becoming a senior engineer is saying "it depends" over and over again until you retire.

In any case, making good tradeoff decisions is a skill every software engineer should learn. These decisions make concrete, significant differences. And thinking about them carefully helps ensure that the software we build continues to provide value to users.

<!--
Thinking of adding:
 - Example of AP vs CP. When would each one be useful? How does this tie into how to think about making tradoffs? Thinking about error handling? When would we prefer one thing to another? Faster writes vs linearizability. Availability vs linearizability. https://stackoverflow.com/a/58298570/9830227
 -->
