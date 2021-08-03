---
title: 'The Tradeoffs We Make'
date: 2021-08-01T12:00:25+01:00
draft: true
url: tradeoffs
---

Building software is as much about making tradeoffs as it is about writing code. Software engineering involves making decisions about what languages, strategies, design patterns, tools, and processes to use. These decisions frequently involve selecting from competing alternatives, tradeoffs where choosing some benefit comes at some cost. There are no simple right or wrong answers in these situations, only better or worse alternatives within the context of the requirements and available resources.

One common tradeoff in software engineering is the space-time tradeoff. In some processes, it is possible to reduce the computation time by using more memory or disk storage. For example, here's a program that prints out the intersection between two arrays, _m_ and _n_:

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

// intersection([1, 5, 2, 9], [5, 4, 9, 0]) prints "5" and "9"
```

This algorithm has a space complexity of _O(1)_ and a time complexity of _O(m\*n)_. But we can write a faster program by making use of more memory.

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

This alternative has a space complexity of _O(m)_ and a time complexity of _O(m+n)_. By making use of a map to store the values in one array, we reduce the time complexity of finding the intersection from quadratic time to linear.

We trade space for time in other ways. For example, we use caching to store frequently requested data instead of re-querying the database. At the cost of more space (the memory of the caches), we reduce the time it takes the application to serve client requests.

![Application caching](https://firebasestorage.googleapis.com/v0/b/firescript-577a2.appspot.com/o/imgs%2Fapp%2FChidi%2FKR94lSVxQ_.png?alt=media&token=3beb934c-81fe-476b-9292-e794c0501f08)

Content Delivery Networks (CDNs) also work as caches. They use a globally distributed network of servers to serve scripts and media files like pictures and videos. Instead of making requests to a single global server, clients make requests to the CDN. The network reduces the time it takes to retrieve a resource at the cost of more storage space.

![Content Delivery Networks](https://firebasestorage.googleapis.com/v0/b/firescript-577a2.appspot.com/o/imgs%2Fapp%2FChidi%2FysLwkXdZyz.png?alt=media&token=98e12653-3714-4b19-b059-8d5c474da956)

Distributed databases have other tradeoffs. Say we have a single database that stores application data and responds to user queries. We can create "replicas" or secondary nodes of the database and distribute incoming read traffic across the different nodes.

![Database replication](https://firebasestorage.googleapis.com/v0/b/firescript-577a2.appspot.com/o/imgs%2Fapp%2FChidi%2FpssvdN0WaT.png?alt=media&token=3a95efb2-ffcd-46ab-bbb5-bd1fad292ce9)

After the primary node receives a write request, it communicates the changes to all the other nodes. However, it takes some time _t_ for the primary node to communicate those changes. If a client tries to read from a secondary before _t_ elapses, the client may get stale data.

Here, we have two choices. The primary node can perform the changes, respond to the client that the write is successful, and then replicate the changes to the other nodes. In this case, we say that the database does not have _linearizability_. After a successful write request, a secondary node might still return a _stale read_.

Alternatively, the primary node can wait to replicate the changes in the other nodes before confirming that the write is successful. This configuration would be linearizable. Every read request would be guaranteed to return the most up-to-date version of the data. But the cost would be that write requests take longer to complete.

![Linearizability over latency in distributed databases](https://firebasestorage.googleapis.com/v0/b/firescript-577a2.appspot.com/o/imgs%2Fapp%2FChidi%2Fe2CFHIjvWM.png?alt=media&token=4b6ec839-f746-47cc-b168-75b5068ca8c5)

![Latency over linearizability in distributed databases](https://firebasestorage.googleapis.com/v0/b/firescript-577a2.appspot.com/o/imgs%2Fapp%2FChidi%2F-GhTNMB4p4.png?alt=media&token=b4233c76-ffb5-463c-a80c-0ae6de589d28)

In these two examples, we assume that the database nodes are able to communicate with one another. But what happens if they aren't? In the case of a network failure, a _partition_ between the nodes in the network, a secondary cannot guarantee that its data is the most up-to-date version.

Again, we have two options. When a secondary cannot guarantee that its data is up-to-date, it can return a timeout or an error. Instead of returning stale data, breaking linearizability, the node becomes unavailable. Alternatively, the node can return with its current data, choosing availability over linearizability.

![Availability over linearizability in distributed databases](https://firebasestorage.googleapis.com/v0/b/firescript-577a2.appspot.com/o/imgs%2Fapp%2FChidi%2FLhqUvdCK7I.png?alt=media&token=4baf074c-27ff-4788-b8c5-c370b5bb0443)

![Linearizability over availability in distributed databases](https://firebasestorage.googleapis.com/v0/b/firescript-577a2.appspot.com/o/imgs%2Fapp%2FChidi%2F-Tz1s8a7T-.png?alt=media&token=00f249a2-700b-4d7c-bdd8-65611f6bbb8d)

In the event of a partition, the tradeoff between latency and linearizability becomes a tradeoff between availability and linearizability. Together, these tradeoffs are formally known as the [PACELC theorem](https://en.wikipedia.org/wiki/PACELC_theorem). The theorem states that in the event of a network partition (P) in a distributed system, one has to choose between availability (A) and consistency (C), else (E), one has to choose between latency (L) and consistency (C). The PACELC theorem is an extension of the earlier [CAP theorem](https://en.wikipedia.org/wiki/CAP_theorem), which only considers the availability-consistency tradeoff in the event of a partition.

These conditions and tradeoffs [aren't as simplistic or binary in practice](https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html). Availability (A) in the CAP/PACELC sense means that every request received by a node in the network must result in a non-error response. So, a system that is not CAP-available may still be available in the sense that it can process requests from other nodes. Similarly, CAP-consistency only describes one kind of consistency: linearizability. That is, a read request after a write must return the most up-to-date value of the data. A non-CAP-consistent system can still support other forms of consistency, like [sequential](https://en.wikipedia.org/wiki/Consistency_model#Sequential_consistency) and [causal consistency](https://en.wikipedia.org/wiki/Consistency_model#Causal_consistency).

In practice, there are varying levels of availability and consistency, a wide spectrum of possibilities. But the tradeoffs themselves don't disappear. Whichever way we turn, decisions we make about the consistency of distributed networks influence latency and availability and vice-versa.

Another common tradeoff in software engineering is the one between performance and ease of use. To make tools or systems easier to use, we sometimes write abstractions that negatively affect performance. High-level languages (like Python and JavaScript) are easier to use than lower-level languages (like C) because of the abstractions they provide. But the benefits usually come at the cost of performance.

Tradeoffs exist in all the different levels and stages of software engineering. Building great software requires being thoughtful about making good tradeoffs. A good tradeoff selects the optimal solution that is best justified by the current circumstances.

It involves a deep understanding of requirements, constraints, and the pros and cons of the alternatives. While making these decisions, we should ask: What resources are available? And how can we use them to deliver desired results? The space-time tradeoffs we made in the previous examples were justified because "space" as a resource was readily available.

Using precise language and fewer buzzwords also clears the path towards making better tradeoff decisions. Instead of saying that one alternative is simply "faster" or "more reliable" than the other, use more qualitative and quantitative descriptions. Aim to be less vague. "Faster" by how much? By how many seconds? Or by what percentage? "More reliable" under what conditions? Incomplete descriptions can hide the full scope and impact of choosing certain alternatives. An alternative might perform abysmally under certain conditions even though it performs well on average.

According to ancient folklore, knowing the _true name_ of a being gives you complete control over it. The mytheme rings true here. As we ask more probing questions to uncover the scope of a tradeoff, its _true name_, we gain more control over the overall decision.

Learning to make thoughtful tradeoffs is also a key part of becoming a technical leader. Good engineering leadership involves understanding the context behind engineering decisions, communicating the impact to the team and other stakeholders, and re-evaluating the decisions when requirements change. Or, [as the memes put it](https://twitter.com/sugarpirate_/status/1348044775887233024): becoming a senior engineer is saying "it depends" over and over again until you retire.

In any case, making good tradeoff decisions is a skill every software engineer should learn. These decisions make real, significant differences, and thinking carefully about them helps ensure that software systems continue to provide value to users.
