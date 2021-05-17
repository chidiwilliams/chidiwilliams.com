---
title: 'Proof of Work'
date: 2021-05-16T11:18:39+01:00
draft: true
url: proof-of-work
math: true
markup: 'mmark'
---

In the early 1970s, a group of British comedians ran a series of surreal comedy sketches called Monty Python's Flying Circus. One of the sketches opened with two customers descending into a greasy spoon cafe. They ask for the breakfast menu, but, much to the annoyance of one of the customers, almost all the dishes contain Spam, a brand of cooked and canned pork. Out of the blue, a group of Vikings sitting in the cafe start to sing "Spam, Spam, Spam... Lovely Spam! Wonderful Spam!".

A few years later, in 1993, a bug in a user's software accidentally posted more than 200 messages to the "news.admin.policy" channel on Usenet, an early discussion system before the Internet. And in response to the bulk post, someone used the term "spam" to refer to the bulk sending of unwanted messages for the first time.

As internet usage exploded in the early 1990s, online spam, and especially, email spam, also sky-rocketed. And software programmers began creating technologies to limit spam on the Internet. One of the first technologies of this kind was The Mail Abuse Prevention System (MAPS), developed by two software engineers, Dave Rand and Paul Vixie. MAPS worked by maintaining a blacklist of IP addresses reported for spam. Email servers would query this list, the Real-time Blackhole List (RBL), and reject incoming emails from the listed sites.

Another early spam-limiting software, proposed by British cryptographer Adam Back, was called Hashcash. Hashcash worked by generating a "postage stamp" for emails. The sender would attach this stamp to an email and the recipient would verify the received Hashcash stamp. To the email recipient, the Hashcash stamp proved that the sender paid a "price" to send the email.

Unlike physical mail where you pay for a postage stamp, sending an email takes almost no time and costs almost nothing once you have a computer and an Internet connection. This is great news for regular Internet users, but it's also great news for malicious spammers. The cheaper and quicker it is to send an email, the more trivial it becomes to send thousands of spam messages at a time.

One proposal that came before Hashcash was to charge email senders. The price of sending a single email would be small enough for regular users but significant enough to make it unprofitable for spammers to send thousands of emails.

A problem with this proposal, though, is that it introduces an extra layer of complexity. To make the system work, we would need a payment service to collect, record, and verify payments for emails. Another problem is that it disincentivizes lower-income Internet users from using email. As we increase the charge to make spamming more unprofitable, we also make email more expensive for regular Internet users.

So, the question was: How do we "charge" email senders without money? Is there a more equitable way to cost Internet users, using something that they already have? Something like...their computers? And here was Hashcash's ingenuity: make the email senders "spend" their CPU processing time. To "pay" for an email with Hashcash, the sender will first need to solve a puzzle, or a cost function, with their computer.

This cost function would introduce an artificial slowness, or throttling, to sending an email. It would be sufficiently difficult to slow down a spammer or discourage them altogether. But it would not be difficult enough to cause regular users to suffer significantly.

The solution to the cost function would also be easy to verify. It should take an email sender some time to solve the puzzle, but it should be much easier for the recipient to check that the sender's solution is correct. A good example of a function like this is the square root function. Finding the square root of a number requires trying different values until a close enough result. But checking that a given square root value is correct is only a matter of multiplying the number by itself.

Next, the function should be consistently difficult. There shouldn't be a shortcut that makes it easy for the spammer to break. In technical terms, we say that the puzzle should not be amenable to amortization. Given $$l$$ values $$m_1...m_l$$, computing $$f(m_1),...,f(m_l)$$ should have amortized cost comparable to computing $$f(m_i)$$ for any $$1 \leq i \leq l$$. Or in English, the puzzle should not be much easier to solve sometimes than it is other times.

Finally, the cost function should be parameterizable. It should be possible to adjust the function such that it requires the email senders to do more or less work depending on our needs.

In the Hashcash implementation of this cost function, before sending an email to a recipient, the sender's computer first prepares a header:

![Parts of a Hashcash header]()

The Hashcash header contains:

1. The Hashcash **version number**, 1.
2. The **number of zero bits** in the hashed code. This number represents the difficulty of the process. Increasing or decreasing it makes it harder or easier to find a valid header. The email sender and recipient agree on what this number should be, but the default value is 20.
3. The **time** of sending the email, with the format `YYMMDD[hhmm[ss]]`
4. The **resource** the header refers to, which is the email address of the recipient.
5. An optional **extension** value for extra metadata.
6. A string of **random characters** (in base64).
7. A **binary counter** (in base64).

The sender initializes the binary counter to a random number, creates the Hashcash header, and then hashes the header using SHA-1. If the resulting hash starts with the required number of zero bits (in our case, 20), then the header is valid. Or else, the sender increments the binary counter and retries the hashing with the new header.

For example, the sender could start with a binary counter `4g67` and then check for its hash value.

```text
Header: 1:20:2105021058:example@chidiwilliams.com::38a82d0eab70d3ab:4g67
Hash: f28a029e0771e4e7b4c957274ac4d8e3fb5bf1de
```

Since the resulting hash does not start with 20 zero bits, the sender will increment the binary counter and hash again until it finds a valid hash.
At a binary counter value of `de580`, we find a valid hash that starts with 20 zero bits (5 zeroes in hexadecimal).

```text
Header: 1:20:2105021058:example@chidiwilliams.com::38a82d0eab70d3ab:de580
Hash: 00000485adb791b968e11defa30d9a3ab1ffc3fb
```

The SHA-1 hash function produces a 160-bit value. So, there are $$2^{160}$$ possible hash values in total, and $$2^{140}$$ hashes where the first 20 bits are 0. On average, a sender would have to try $$2^{20}$$ different binary counters to find a valid hash.

To increase the amount of time it takes to find a solution (in order to further slow down a spammer), we can increase the number of leading zero bits we wish to find in the hash. For example, it would take about $$2^{25}$$ different tries on average to find a hash with 25 leading zero bits. From this, we can see that the time needed to find a valid hash increases exponentially with the number of zero bits.[^qed]

After finding a valid header, the email sender attaches it to the email request:

```text
X-Hashcash: 1:20:2105021058:example@chidiwilliams.com::38a82d0eab70d3ab:de580
```

When a recipient receives an email, first it checks that the email contains the Hashcash header. Then it hashes the header and checks that it contains the required number of leading zero bits. The email recipient only needs to compute the hash once, so it takes much less time to verify a stamp than to find a valid stamp.

If the recipient checks that the hash is valid, and the email address and date on the header are correct, then they accept the email. The recipient also stores the hash in a database and checks subsequent headers to ensure the header isn't reused.

If the email header fails any of the proof-of-work checks, the recipient stores the email in a separate spam folder or discards it altogether.
By adding this extra computation, Hashcash helps to slow down spammers without charging for sending emails. Yet, it's difficult to find the balance between making it hard for spammers to send emails and keeping it easy for regular users. As computers get faster, email recipients would need to increase the difficulty of the Hashcash computation (by requiring more leading zero bits). But this would also make it increasingly difficult for lower-income individuals with slow hardware to use email.

Spam filters today rely on a different set of techniques. In a process known as Bayesian filtering, the spam filter correlates some identifiers with spam messages and other identifiers with legitimate emails. And then it calculates the probability that an incoming email is a spam email based on the presence of those identifiers. The filter then marks emails with scores below a certain threshold as spam or blocks them altogether.

Bayesian filters look at all the different parts of an email to make a decision: words and phrases in the subject and body of the email, source IP addresses, and other technical metadata. And the filters also get better over time. A user can manually mark or unmark an email as spam to teach the filter.
But the Hashcash story barely ends there. In 2009, someone found an innovative way to use the Hashcash proof-of-work algorithm to provide consensus in a distributed network.

In this network, "miners" compete with each other to add blocks of transactions to a shared chain. For a block to be accepted by the other network participants, the miners must complete a proof-of-work task using the block's data. When a miner finds the correct solution, they publish their work to the network for other miners to verify that their solution is correct.

All the network clients also share a large 256-bit number called the **target**. For the network to accept a new block, the SHA-256 hash of the block's header must be lower than or equal to the current target. And every 2016 blocks, each client checks how long it took to generate the last 2016 blocks, and then adjusts the target to match the desired rate of 2016 blocks every 2 weeks.

This speed regulation protects the network from tampering. To change a block in the network, an attacker would need to create a new block and regenerate all the successors of the original block, which requires enormous computational effort.

The Hashcash proof-of-work also gives all the clients a fair opportunity to participate in the network. Similar to how the Hashcash spam filter protected lower-income users from higher-income spammers by making email senders pay using computational power instead of money, the proof-of-work algorithm in this network also prevents higher-income nodes from taking control of the entire network.

And so, Adam Back's brainchild found a new expression under this distributed network proposed by a pseudonymous Satoshi Nakamoto. And what was first a tool to control pesky email spams inspired the revolutionary new financial technology called Bitcoin.

## Notes

[^qed]: I ran a few benchmarks and found that my computer is able to run 9,112,333 SHA-1 hashes a second. The projected time to find a hash with 20 leading zero bits was 0.115 seconds, 24 bits 1.841 seconds, 28 bits 29.458 seconds, and 30 bits 117.834 seconds. (MacBook Pro, 1.4GHz Quad-Core Intel Core i5, 8 GB 2133 MHz RAM)
