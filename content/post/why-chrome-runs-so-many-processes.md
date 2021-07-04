---
title: 'Why Chrome Runs So Many Processes'
date: 2021-07-04T10:18:56+01:00
draft: false
url: chrome-processes
images:
  [
    https://res.cloudinary.com/cwilliams/image/upload/c_crop,h_350,w_670,x_0/v1625394129/Blog/E4ubeZxWQAE8JdE.jpg,
  ]
---

_(Originally published [on Twitter](https://twitter.com/ChidiWilliams__/status/1408401252090798081))_

If you've ever tried force quitting Chrome and wondered why there were so many different Google Chromes to close, here's why:

![Screenshot of Activity Monitor on Mac showing Chrome running on several processes](https://res.cloudinary.com/cwilliams/image/upload/v1625394129/Blog/E4ubeZxWQAE8JdE.jpg)

A process is a collection of a program and its resources: its separate memory space (or "virtual address space"), its process identifier, handles to files and other system objects, etc. And a thread is an entity within a process that can be scheduled for the operating system to execute.

Each process starts with one thread, its primary thread. But it can create additional threads from any of its existing threads. For example, when you open Microsoft Word, the operating system creates a new process and assigns it some memory space and an identifier. Then, it runs the Word program within that process.

The Microsoft Word process can create multiple threads of execution. One thread might handle editing the document based on your keyboard input. And another thread could be auto-saving or printing the document.

Operating systems can execute threads concurrently. They can handle a small task in one thread, switch to handle another small task in a different thread, and so on, very quickly—creating an illusion of doing multiple things at the same time. And, on multi-processor computers, they can execute different threads on separate processors at the same time.

As a result, you can edit a document while printing another document. And a streaming app like Spotify can play a song as it downloads another song in the background. You can even do all four at once if you're feeling up to it.

Each process runs in its own assigned memory space. But threads within a process share the process's memory. A Microsoft Word process cannot directly access the data in a Spotify process. But threads within the Microsoft Word process can access the data in their process.

Over time, websites have become more and more like full-blown applications. And browsers have evolved from being simple document viewers to becoming pseudo-operating systems.

Like operating systems, many browsers use processes to isolate websites from each other and the browser. Chrome—or, more accurately, its internal browser, Chromium—uses a process-per-site-instance architecture. When you open a new **site instance**, the main Chrome process creates a new **renderer process**.

A site instance is a group of connected pages from the same site. Opening a new tab creates a new "site instance". And so does navigating to a different site from your current tab. But when a page opens another page with the same domain name using `window[dot]open`, both pages are in the same instance.

```js
// window.location.href === 'https://my-site.com';

// Opens a new tab/window. The new page will be
// in the same site instance as its parent.
window.open('https://my-site.com/page');
```

The renderer process handles everything that happens within the tab. Inside the renderer process, the main thread parses the HTML into a DOM, parses the CSS to determine the computed styles for each DOM node, and runs the page's JavaScript.

Running each site instance in a separate process means that browsers can take advantage of the operating system's process isolation. Each site instance runs in its own address space. A script running in one instance cannot access the memory of another site instance. And each site instance crashes independently.

(To test this out, run `x=[];for(;;)x.push(1);` in DevTools. Only the current tab should crash... hopefully 🙃)

But the cost of this multi-process architecture is that it uses more memory than if a single process controlled all the tabs.

Since this architecture is a feature of Chromium, other Chromium-based browsers like Brave, Edge, and Torch work in the same way. Non-Chromium browsers like Safari and Firefox also use similar architectures.

![Screenshot of Activity Monitor on Mac showing Safari running on multiple processes](https://res.cloudinary.com/cwilliams/image/upload/v1625394255/Blog/E4uiAUpWUAQUGeN.jpg)

So, the next time your computer is running hot, fans blazing, and you're trying to rage quit your browser, you'll remember that there are so many processes because your browser isolates tabs to protect your data. And maybe that'll make you feel a little better... Or not 👀

If you want to learn more about browser architectures, here are some resources for [Chromium](https://chromium.org/developers/design-documents/multi-process-architecture), [Google Chrome](https://developers.google.com/web/updates/2018/09/inside-browser-part1), and [Firefox](https://extremetech.com/internet/250930-firefox-54-finally-supports-multithreading-claims-higher-ram-efficiency-chrome).
