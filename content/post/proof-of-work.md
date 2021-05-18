---
title: 'Proof of Work'
date: 2021-05-16T11:18:39+01:00
draft: false
url: proof-of-work
math: true
# markup: 'mmark'
---

In the early 1970s, a British comedy group ran a series called Monty Python's Flying Circus. One of the sketches opens with two customers descending into a greasy spoon cafe. The waitress reads out the breakfast menu. But almost all the dishes contain Spam (a brand of cooked and canned pork). As one of the customers complains about the dull menu, a group of Vikings start to chant, "Spam, Spam, Spam... Lovely Spam! Wonderful Spam!"

Years later, that sketch inspired a new meaning to the word "spam". Usenet was an early discussion system before the Internet started in 1980. And in the late 1980s and early 1990s, Usenet members began to refer to unwanted messages in the groups as "spam".

As internet usage exploded in the early 1990s, spam messages also sky-rocketed. And software programmers began creating technologies to control spam. One of them was the Mail Abuse Prevention System (MAPS). And it maintained a blacklist of IP addresses reported for spam. Email servers would query the list and then reject incoming emails from the listed sites.

Another early spam-limiting software, proposed by British cryptographer Adam Back, was Hashcash. Hashcash worked by generating a "postage stamp" for emails. The sender would attach this stamp to an email, and the recipient would verify it.

Sending an email takes no time and costs nothing. That's great news for regular Internet users. But it's also great news for spammers. The cheaper and quicker it is to send an email, the more trivial it to send several spam messages.

One proposal that came before Hashcash involved charging for email. The price of sending a single email would be small enough for regular users. But it would be significant enough to make spamming unprofitable.

But this adds an extra layer of complexity. To make the system work, we need a payment service to collect, record, and verify payments for emails. It also makes it harder for lower-income Internet users to use email. We may need to increase the charge to make spamming more unprofitable. But that also makes email more expensive for everyone else.

Is there a fairer way to charge email senders? Can they pay using something they already have? Something like...their computers? That was Hashcash's ingenuity. Make email senders "spend" their CPU processing time. To "pay" for an email with Hashcash, the sender's computer would solve a cost function.

This cost function introduces an artificial slowness, or throttling, to sending an email. It would be difficult enough to slow down a spammer or discourage them altogether. But not enough to trouble regular users.

The solution to the cost function would also be easy to verify. It should take an email sender some time to solve. But it should be much easier for the recipient to check the solution, or "proof of work". One example of a function like this is the square root function. To find the square root of a number, we [try different values till we find a good result](https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method). But verifying the solution is only a matter of multiplying the number by itself.

The cost function should not have a shortcut that makes it easy for the spammer to break. In technical terms, the function should not be amenable to amortization. Given \\(l\\) values \\(m_1...m_l\\), computing \\(f(m_1),...,f(m_l)\\) should have amortized cost comparable to computing \\(f(m_i)\\) for any \\(1 \leq i \leq l\\). Or, in plain language, the cost function should not be much easier to solve sometimes than it is other times.

Finally, the cost function should be parameterizable. The email recipient may want senders to do more or less work. So it should be possible to adjust the difficulty of the cost function.

In Hashcash, the sender's computer first prepares a header before sending an email:

![Parts of a Hashcash header](https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_750/v1621282181/Blog/hashcash-header.png)

The Hashcash header contains:

1. The Hashcash **version number**, 1
2. The **number of leading zero bits** in the hashed code
3. The **time** of sending the email, in the format `YYMMDD[hhmm[ss]]`
4. The **resource** the header refers to, which is the email address of the recipient
5. An optional **extension** value for extra metadata
6. A string of **random characters** (in base64)
7. A **binary counter** (in base64)

The number of leading zero bits represents the difficulty of the process. The default value is 20. But an email recipient can ask for a larger or smaller value to make it harder or easier to find a valid header.

The sender sets the counter to a random number and creates the Hashcash header. Then it hashes the header using SHA-1. If the resulting hash starts with the required number of zero bits (in our case, 20), then the header is valid. Or else, the sender increments the binary counter and retries the hashing.

For example, the sender could start with a binary counter `4g67` and then check its hash value.

```text
Header: 1:20:2105031017:user@example.com::45734c1e80133cf2:4g67
Hash: 9644352301bdac38585d06ae4e7fec5bd4b4b1ea
```

The resulting hash does not start with 20 zero bits. So, the sender increments the binary counter and hashes again until it finds a valid hash.

At a binary counter value of `136cae`, the hash of the header starts with 20 zero bits (5 zeroes in hexadecimal). We've found a valid header.

```text
Header: 1:20:2105031017:user@example.com::45734c1e80133cf2:136cae
Hash: 00000bf1b6a5d3a5e16ca0d68e20baec639e3070
```

SHA-1 produces a 160-bit value. There are \\(2^{160}\\) possible hash values in total and \\(2^{140}\\) hashes where the first 20 bits are 0. So, to find a valid hash, a sender has to try \\(2^{20}\\) different binary counters on average.

To slow down spammers more, we can increase the number of leading zero bits we need in the hash. For example, it would take about \\(2^{25}\\) tries to find a hash with 25 leading zero bits. For each extra zero bit, the average time it takes to find a valid hash doubles.[^1]

After finding a valid header, the email sender attaches it to the email request:

```text
X-Hashcash: 1:20:2105021058:example@chidiwilliams.com::38a82d0eab70d3ab:de580
```

When a recipient receives an email, it first checks that the email has the Hashcash header. Then it hashes the header and checks that it has the required number of leading zero bits. The recipient only needs to compute the hash once. So it takes much less time to verify a stamp than to find a valid one.

If the hash is valid and the email address and date on the header are correct, the recipient accepts the email. Then it stores the hash in a database. When it gets a new email, it checks this database to see if it has received the header before.

If the email fails the Hashcash checks, the recipient moves it to a spam folder or discards it.

By adding this extra computation, Hashcash slows down spammers without charging for emails. But it's hard to find a balance. As computers get faster, email recipients would increase the Hashcash difficulty. And sending emails would become more difficult for lower-income individuals with slow hardware.

Spam filters today rely on a different set of techniques. A **Bayesian filter** correlates some identifiers with spam and others with legitimate emails. It checks for the presence of these identifiers in an incoming email. And then, it calculates the probability that the email is spam. If the email scores below a certain threshold, the filter marks it as spam.

Bayesian filters extract the identifiers from different parts of an email. Like, phrases in the subject and body, the source IP address, and other technical metadata. The filters also get better over time. A user can mark or unmark an email as spam to teach their filter to make better decisions.

But the Hashcash story doesn’t end there. In 2009, someone found an innovative way to use Hashcash in a distributed network.

In this network, “miners” compete with each other to add blocks of transactions to a shared chain. To add a new block to the network, a miner must complete a proof-of-work task using the block’s data. When one miner finds a correct solution, they publish their work for others to verify.

All the miners share a large 256-bit number called the **target**. For the network to accept a new block, the SHA-256 hash of its header must be lower than or equal to the current target. And every 2016 blocks, each client checks how long it took to generate the last 2016 blocks. And then, it adjusts the target to match the desired rate of 2016 blocks every two weeks.

This speed regulation protects the network from tampering. To change an existing block, an attacker would need to regenerate all its successors. It would take an enormous computational effort, and the attack would be impractical.

Hashcash also gives all the miners a fair opportunity to participate. Miners compete with computation instead of money. And that prevents high-income nodes from taking control of the entire network.

Adam Back’s brainchild found a new expression here. It began as a tool for controlling pesky email spams. And then, it inspired the revolutionary, distributed financial technology called Bitcoin.

## Notes

[^1]: I ran a few benchmarks on my computer (1.4GHz Quad-Core Intel Core i5 CPU, 8 GB 2133 MHz RAM). The hash generation speed was 9,112,333 SHA-1 hashes a second. The projected time to find a hash with 20 leading zero bits was 0.115 seconds, 24 bits 1.841 seconds, 28 bits 29.458 seconds, and 30 bits 117.834 seconds.
