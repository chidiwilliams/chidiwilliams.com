---
title: 'Text Search with Tries'
date: 2021-11-13T00:06:52Z
draft: false
series: [Data Structures and Algorithms in the Wild]
---

In the [previous post](/post/quadtrees/) in the [Data Structures and Algorithms in the Wild](/series/data-structures-and-algorithms-in-the-wild/) series, we explored the quadtree, a tree data structure used to index locations in two-dimensionsional space.

In this post, we'll look into another data structure called the trie. Like the quadtree, the trie is also a tree structure. But, while quadtrees search through locations, tries search through text.

## Prefix tries

Say we wish to write a program to find all the words in a dictionary that start with a prefix. We can represent the dictionary as a list of words:

```javascript
// Returns all the words in the dictionary that start with the prefix
function startsWith(dictionary, prefix) {
  const matches = [];

  // For each word in the dictionary...
  for (let i = 0; i < dictionary.length; i++) {
    const word = dictionary[i];

    let prefixed = true;

    // Check each character in the prefix
    for (let j = 0; j < prefix.length; j++) {
      // If the character is not in the correct position in this word...
      if (prefix[j] !== word[j]) {
        // ...then the word does not start with the prefix
        prefixed = false;
      }
    }

    // If `prefixed` is still true after checking all the
    // characters in the prefix, we have a match!
    if (prefixed) {
      matches.push(word);
    }
  }

  // Return all the correct matches
  return matches;
}

const dictionary = ['ant', 'antelope', 'bear', 'cat', 'dog'];
exists(dictionary, 'ant'); // ['ant', 'antelope']
exists(dictionary, 'lion'); // []
```

To find the matches in this program, we check every word in the dictionary. And, for each word, we check whether it matches the prefix. Consequently, the runtime complexity of the program is _O(p\*q)_, where `p` is the number of words in the dictionary and `q` is the length of the prefix.

### Grouping by the first character

In the previous post on quadtrees, we learned that we can improve search performance by grouping related entities together. Let's see if a similar technique can help us here.

Instead of putting all the words in one list, we can group the words by their first characters. All words starting with 'a' will be in one list, 'b' in another list, and so on. We can think of each group as a child dictionary.

<!-- prettier-ignore -->
```javascript
const alphabet = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i',
  'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r',
  's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
];

// Adds a new word to the dictionary
function insert(dictionary, word) {
  // Get the index of the first character in the alphabet.
  // `index` will be a number from 0 to 25.
  const index = alphabet.indexOf(word[0]);

  // If a group has not been made for this letter, create it
  if (!dictionary[index]) {
    dictionary[index] = [];
  }

  // Push the word to its bucket
  dictionary[index].push(word);
}

// Initialize `dictionary` with 26 child dictionaries
const dictionary = new Array(26); // [...]
insert(dictionary, 'ant'); //        [['ant'], ...]
insert(dictionary, 'antelope'); //   [['ant', 'antelope'], ...]
insert(dictionary, 'chicken'); //    [['ant', 'antelope'], ..., ['chicken'], ...]
```

{{<iframefigure src="https://chidiwilliams.github.io/dsaw/tries/demos/group-1.html" height="500px" caption="Type into the textbox to add words to the dictionary" >}}

To find words that begin with a prefix, we only need to check the correct child dictionary.

```javascript
function startsWith(dictionary, prefix) {
  // Get the child dictionary where the words starting with the prefix will be
  const child = dictionary[alphabet.indexOf(prefix[0])];

  // Return the matches from the correct child dictionary
  return getMatches(child, prefix);
}

// Returns the prefix matches from a list
function getMatches(dictionary, prefix) {
  const matches = [];

  for (let i = 0; i < dictionary.length; i++) {
    const word = dictionary[i];

    let prefixed = true;
    for (let j = 0; j < prefix.length; j++) {
      if (prefix[j] !== word[j]) prefixed = false;
    }

    if (prefixed) matches.push(word);
  }

  return matches;
}
```

Instead of searching through the entire dictionary, we only check the child dictionary starting with the same first character as the prefix.

If we assume that the words are evenly distributed among the child dictionaries, the time complexity of this implementation will be _O(1 + (p/26)\*q)_. We check for the correct child dictionary in constant time, _O(1)_. Then we compare the prefix with the words in a child dictionary 1/26 times the size of the entire dictionary, giving _O((p/26)\*q)_.

(We can simplify the time complexity to _O((p/26)\*q)_, but leaving it expanded as _O(1 + (p/26)\*q)_ will help us understand the implementation better as we proceed.)

### Grouping by the first two characters

The performance of the current implementation, _O(1 + (p/26)\*q)_, is already better than what we started with, _O(p\*q)_. But we can do even better.

We can take the grouping a step further. Just like we split the dictionary, we'll split the child dictionaries by the second characters of the words. All words starting with 'aa' will be in one "grand-child" dictionary, 'ab' in another, and so on.

```javascript
function insert(dictionary, word) {
  // If a group has not been made for the first letter, create it
  const firstLetterIndex = alphabet.indexOf(word[0]);
  if (!dictionary[firstLetterIndex]) {
    dictionary[firstLetterIndex] = new Array(26);
  }

  // If a group hasn't been made for the second letter, create it
  const secondLetterIndex = alphabet.indexOf(word[1]);
  if (!dictionary[firstLetterIndex][secondLetterIndex]) {
    dictionary[firstLetterIndex][secondLetterIndex] = [];
  }

  // Push the word to its correct group
  dictionary[firstLetterIndex][secondLetterIndex].push(word);
}

const dictionary = new Array(26);
insert(dictionary, 'apple'); // [[..., ['apple'], ...], ...]
insert(dictionary, 'bear'); //  [[..., ['apple'], ...], [..., ['bear'], ...], ...]
insert(dictionary, 'bee'); //   [[..., ['apple'], ...], [..., ['bear', 'bee'], ...], ...]
insert(dictionary, 'bull'); //  [[..., ['apple'], ...], [..., ['bear', 'bee'], ..., ['bull'], ...], ...]
```

As before, to find the words beginning with a prefix, we search through the correct grand-child dictionary:

```javascript
function startsWith(dictionary, prefix) {
  const grandChild = dictionary[alphabet.indexOf(prefix[0])][alphabet.indexOf(prefix[1])];
  return getMatches(grandChild, prefix);
}

startsWith(dictionary, 'be'); // ['bear', 'bee']
```

Because the buckets get even smaller, the search performance improves further. If we assume the words are evenly distributed, we should have `26*26` groups for all the different combinations from 'aa' to 'zz'. The time complexity of the implementation becomes _O(1 + (p/(26\*26))\*q)_.

As you might expect, we can take this a third step, still. But before we consider that, there's a little problem we need to address. How do we add one-character words, like "a", to the dictionary? In the current implementation, we expect words to have at least two characters.

To fix this, we can add a flag to each level of the tree, to say whether the level itself is a word. For example, the group for 'a' will hold the child dictionaries ('aa', 'ab', ...) as well a flag that says whether or not 'a' itself is a word in the dictionary.

We can rewrite the `insert` function as:

```js
function insert(dictionary, word) {
  // As we go deeper into the dictionary, we need to keep track
  // of the current level we're on, starting from the root dictionary
  let current = dictionary;

  // Create a child dictionary for words starting with the first character
  const firstLetterIndex = alphabet.indexOf(word[0]);
  if (!current.children[firstLetterIndex]) {
    // The `isEndOfWord` flag denotes whether this child dictionary is itself a word
    current.children[firstLetterIndex] = { isEndOfWord: false, children: new Array(26) };
  }
  // Update current to point to the child dictionary
  current = current.children[firstLetterIndex];

  // If the word has only one character, then the child dictionary is a word
  if (word.length === 1) {
    current.isEndOfWord = true;
    return;
  }

  // Create a child dictionary for words starting with the second character
  const secondLetterIndex = alphabet.indexOf(word[1]);
  if (!current.children[secondLetterIndex]) {
    current.children[secondLetterIndex] = { isEndOfWord: false, children: new Array(26) };
  }
  current = current.children[secondLetterIndex];

  // If the word has two characters, then the current child dictionary is a word
  if (word.length === 2) {
    current.isEndOfWord = true;
    return;
  }

  // The word has more than two characters, push it to the current child dictionary
  current.children.push(word);
}
```

{{<iframefigure src="https://chidiwilliams.github.io/dsaw/tries/demos/group-2.html" height="500px" caption="Type into the textbox to add words to the dictionary. Child dictionaries that are the end of words are coloured brown." >}}

### Grouping by all the characters

In the previous section, we improved the performance of searching a dictionary by grouping words by their first two characters. But the implementation is still not as optimal as it can be. When we try to find words starting with the prefix 'abc', for example, we currently loop through all the words in the 'ab' dictionary.

Alternatively, instead of specifying a number of levels beforehand, we can group by _all_ the characters in each word. When we add 'apple' to the dictionary, for example, we'll create sub-dictionaries for 'a', 'ap', 'app', 'appl', and 'apple'.

```javascript
function insert(dictionary, word) {
  let current = dictionary;

  // For each character in the word...
  for (let i = 0; i < word.length; i++) {
    // Create a new child dictionary for this character
    const index = alphabet.indexOf(word[i]);
    if (!current.children[index]) {
      current.children[index] = { isEndOfWord: false, children: new Array(26) };
    }

    // Update the current child dictionary
    current = current.children[index];
  }

  // The deepest child dictionary represents the last character in the word
  current.isEndOfWord = true;
}
```

{{<iframefigure src="https://chidiwilliams.github.io/dsaw/tries/demos/trie.html" height="500px" caption="Type into the textbox to add words to the dictionary. Child dictionaries that are the end of words are coloured purple." >}}

To get the words that begin with a prefix, we first find the child dictionary corresponding to the prefix, and then collect all the words in its children.

```js
function startsWith(dictionary, prefix) {
  let current = dictionary;

  // For each character in the prefix...
  for (let i = 0; i < prefix.length; i++) {
    const index = alphabet.indexOf(prefix[i]);

    // If there is no child dictionary, there
    // are no words starting with the prefix
    if (!current.children[index]) return [];

    current = current.children[index];
  }

  // At the end of the prefix, we collect the words
  // in the current child dictionary and its children
  const matches = [];
  collectWords(current, prefix, matches);
  return matches;
}

// Collects the words in the dictionary and its children into `words`
function collectWords(dictionary, currentWord, words) {
  // If the current dictionary is the end of the word, collect the word
  if (dictionary.isEndOfWord) words.push(currentWord);

  // Collect the words from each child dictionary
  dictionary.children.forEach((childNode, i) => {
    collectWords(childNode, currentWord + alphabet[i], words);
  });
}
```

The time complexity of this implementation is the time it takes to check all the characters in the prefix, _O(q)_, _plus_ the time it takes to collect the remaining characters in the matched words (let's call this _O(a\*b)_, where `a` is the number of matched words and `b` is the average number of characters in each matched word). And so, the time complexity of this implementation is _O(q + a\*b)_.

We can compare this to the list implementation in the first section which had a time complexity of _O(p\*q)_. If we make the reasonable assumption that the number of matches from a search is much smaller than the total number of words in the dictionary, i.e. `a << p`, we see that _O(q + a\*b)_ is a much better time complexity than _O(p\*q)_.

Tries let us efficiently re*trie*ve textual information, which is how it gets its name.

## Suffix tries

In the previous section, we saw how to use a prefix tree, or _trie_, to search through words in a dictionary. Let's consider a slightly different problem tries help us solve.

Say we want to check whether some text appears in a larger text. For example, whether 'side' appears in 'consider'.

We can write this as:

```js
function contains(str, substr) {
  // Walking through the characters in `str`...
  for (let i = 0; i <= str.length - substr.length; i++) {
    // At each point, we'll keep a flag to say whether the
    // characters from that point match the substring
    let sameChars = true;

    // Check if all the characters in the string
    // (counting from index `i`) match the substring
    for (let j = 0; j < substr.length; j++) {
      if (str[i + j] !== substr[j]) {
        sameChars = false;
        break;
      }
    }

    // If all the characters are the same, we have a match! :)
    if (sameChars) return true;
  }

  // At this point, we've checked through the
  // entire string, but there's no match :(
  return false;
}
```

To check whether the string contains the substring, we loop through the characters in the string, and at each character, we check whether the substring matches from that point. We can represent this as _O(p\*q)_, where `p` is the length of the string and `q` is the length of the substring.

There's another way to look at this implementation. Looping through the characters in the string is much like looping through an array of the string's suffixes. When we look for 'side' in 'consider', we're checking whether any string in this array starts with 'side':

<!-- prettier-ignore -->
```js
['consider', 'onsider', 'nsider', 'sider', 'ider', 'de', 'r']
```

We're in familiar territory here. We have a list of "words" and we want to check whether one of the words starts with a prefix. We already know a good way to solve this problem: the trie!

We can add all the suffixes into a trie and then check the trie for the substring:

```js
function hasPrefix(tree, prefix) {
  let current = tree;

  // For each character in the prefix...
  for (let i = 0; i < prefix.length; i++) {
    const index = alphabet.indexOf(prefix[i]);

    // If there is no child tree, there
    // are no words starting with the prefix
    if (!current.children[index]) return false;

    current = current.children[index];
  }

  // If child trees exist till the end of the
  // prefix, then the tree contains the prefix!
  return true;
}
```

The time complexity of checking whether the prefix exists in the tree is _O(q)_, where _q_ is the length of the substring. Effectively, by _indexing_ the string into a suffix trie beforehand, we improve the performance of searching for a substring from _O(p\*q)_ to _O(q)_.

{{<iframefigure src="https://chidiwilliams.github.io/dsaw/tries/demos/substring.html" height="400px" caption="Search for a substring within a text. Only the nodes coloured green or red are checked. Correct matches will have all green nodes. Wrong matches will end in a red node." >}}

Suffix tries are typically much larger than the text they represent. And so, a compressed version of the suffix trie, known as the [_suffix tree_](https://en.wikipedia.org/wiki/Suffix_tree), is usually used instead. These suffix trees are useful in many text-based operations, like free-text search and for finding patterns in long DNA and protein sequences.
