---
title: 'Tries'
date: 2021-11-05T00:06:52Z
draft: true
series: [Data Structures and Algorithms in the Wild]
---

_This is the second post in the Data Structures and Algorithms in the Wild series._

---

In this post, we look at another data structure called the Trie. Just like the quadtree, the trie is also a tree structure, but used in a different set of use cases. Tries come in text based operations, like prefix searching and autocomplete. And also spell-checking and hyphenation?

## Prefix tries

For example, let's say we wanted to write a program to search a dictionary of words to find words that match a prefix. If we represent the dictionary as a list, we can check for the words in linear time.

```javascript
// Returns words in the dictionary that start with `prefix`
function startsWith(dictionary, prefix) {
  const matches = [];

  // For each word in the dictionary...
  for (let i = 0; i < dictionary.length; i++) {
    const word = dictionary[i];

    let prefixed = true;

    // Check each character in the prefix
    for (let j = 0; j < prefix.length; j++) {
      // If the character is not in the correct position in this word,
      // then the word does not start with the prefix
      if (prefix[j] !== word[j]) {
        prefixed = false;
      }
    }

    // After checking all the characters in the prefix, if
    // `prefixed` is still true, we have a match!
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

As the size of the dictionary increases, the time it takes to find the matching words in the dictionary increases linearly. This is actually O(n \* l), where l is the length of the prefix.

> I'm thinking maybe write an example with a hash here...

### One bucket groups

But if you remember the previous post on Quadtrees, we saw how you can improve the search performance by grouping related entities together. We can use a similar mental model to improve the performance of this search.
By putting all the words into a plain list, we are not as optimized as we can be. Instead, let's group the words in the dictionary by their first letter. We'll put all words starting with a in one "bucket", all words starting with b in another bucket, and so on.

<!-- prettier-ignore -->
```javascript
const alphabet = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i',
  'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r',
  's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
];

// Adds a new word to the dictionary
function insert(dictionary, word) {
  // Get the index of the first letter in the alphabet.
  // `index` will be a number from 0 to 25.
  const index = alphabet.indexOf(word[0]);

  // If a `bucket` has not been made for this letter, create it
  if (!dictionary[index]) {
    dictionary[index] = new Array(26);
  }

  // Push the word to its bucket
  dictionary[index].push(word);
}

const dictionary = new Array(26); // [...]
insert(dictionary, 'ant'); //        [['ant'], ...]
insert(dictionary, 'antelope'); //   [['ant', 'antelope'], ...]
insert(dictionary, 'chicken'); //    [['ant', 'antelope'], ..., ['chicken'], ...]
```

Now to search the dictionary for words that begin with a prefix, we only need to check the corresponding bucket.

```javascript
function startsWith(dictionary, prefix) {
  // Get the bucket where the words with the prefix will be
  const bucket = dictionary[alphabet.indexOf(prefix[0])];
  const matches = [];

  // Check for the matches only in the correct bucket
  for (let i = 0; i < bucket.length; i++) {
    const word = bucket[i];

    let prefixed = true;
    for (let j = 0; j < prefix.length; j++) {
      if (prefix[j] !== word[j]) prefixed = false;
    }

    if (prefixed) matches.push(word);
  }

  return matches;
}
```

We should expect that this implementation works slightly better than the first one. Instead of searching through the entire list, we only need to check the list for the correct first letter. If we assume that the words in the dictionary are evenly distributed among the buckets, the time complexity for this implementation would be **O(1 + n/26)**. We check for the correct bucket in constant time, **O(1)**. And then we get the word from the bucket in **O(n/26)** time.

### Grouping in two buckets

But we can take this a step further. We can put words starting with 'aa' in one bucket, words starting with 'ab' in a different bucket, and so on. We would modify both `insert` and `startsWith` as follows:

```javascript
function insert(dictionary, word) {
  // Create a new bucket for words starting with the first character
  const firstLetterIndex = alphabet.indexOf(word[0]);
  const secondLetterIndex = alphabet.indexOf(word[1]);

  // Create a bucket for words starting with the first character
  if (!dictionary[firstLetterIndex]) {
    dictionary[firstLetterIndex] = [];
  }

  // Create a bucket for words starting with the first and second character
  if (!dictionary[firstLetterIndex][secondLetterIndex]) {
    dictionary[firstLetterIndex][secondLetterIndex] = [];
  }

  // Push the word to its bucket
  dictionary[firstLetterIndex][secondLetterIndex].push(word);
}

const dictionary = new Array(26);
insert(dictionary, 'bear'); // [..., [..., ['bear'], ...], ...]
insert(dictionary, 'bee'); //  [..., [..., ['bear', 'bee'], ...], ...]
insert(dictionary, 'bull'); // [..., [..., ['bear', 'bee'], ..., ['bull'], ...], ...]
```

As before, to find the words that begin with a prefix, we check the first and second letters to find the correct bucket:

```javascript
function startsWith(dictionary, prefix) {
  const bucket = dictionary[alphabet.indexOf(prefix[0])][alphabet.indexOf(prefix[1])];

  // Check for matches in this bucket...
}

startsWith(dictionary, 'be'); // ['bear', 'bee']
```

Now, `startsWith` has an even better performance than before, because the buckets are even smaller. If we assume the words are evenly distributed, we should have `26*26` buckets for all the different combinations from `aa` to `zz`. We can find the correct bucket in constant time, **O(1)**. Then we find the words in the bucket in **O(n/(26\*26))** time.

But there's a little problem with this approach. How do we add words that have less than 2 characters. For example, if we wanted to add the word 'a' to the dictionary. Since we compulsorily need two levels of buckets, our implementation can only support words with two or more characters.

To fix this, we can go add a flag to each bucket to say whether or not the bucket is a word itself. Every bucket is now no longer an array of children characters, but also contains information about whether the bucket is the end of a word or not. We can rewrite the `insert` function as:

```js
function insert(dictionary, word) {
  // Create a new bucket for words starting with the first character
  const firstLetterIndex = alphabet.indexOf(word[0]);

  // Create a bucket for words starting with the first character
  if (!dictionary.children[firstLetterIndex]) {
    dictionary.children[firstLetterIndex] = { children: new Array(26) };
    // TODO: Maybe push word? and save isWord = true
  }

  const secondLetterIndex = alphabet.indexOf(word[1]);

  // Create a bucket for words starting with the first and second character
  if (!dictionary[firstLetterIndex][secondLetterIndex]) {
    dictionary[firstLetterIndex][secondLetterIndex] = { children: new Array(26) };
    // TODO: Maybe push word? and save isWord = true
  }

  // Push the word to its bucket
  dictionary[firstLetterIndex][secondLetterIndex].push(word);
}

// TODO: Maybe convert this to use visualization instead
const dictionary = { children: new Array(26) };
insert(dictionary, 'h');
insert(dictionary, 'heat');
```

To check for whether a word exists in the dictionary, we check each level taking note of the `isWord` flag.

```js
function startsWith(dictionary, prefix) {
  let bucket = dictionary;
  const words = [];

  const firstLetterIndex = alphabet.indexOf(prefix[0]);
  if (!bucket.children[firstLetterIndex]) {
    return words;
  }

  // If this bucket is itself a word, push the word
  if (bucket.children[firstLetterIndex].isWord) {
    words.push(prefix[0]);
  }

  if (prefix.length > 1) {
    const secondLetterIndex = alphabet.indexOf(prefix[0]);
    if (!bucket.children[secondLetterIndex]) {
      return words;
    }

    if (bucket.children[secondLetterIndex].isWord) {
      words.push(prefix[0] + prefix[1]);
    }

    // Check for matches in this bucket
  }
}

startsWith(dictionary, 'be'); // ['bear', 'bee']
```

<!-- TODO: Animate each level of this -->

Now we can add words with one or more characters and we can find the words using a prefix with only one character. We've also seen that when we add deeper layers to the tree, we no longer need to store the words themselves in the layer. For example, instead of storing the words starting with 'a', we can instead store words starting with 'aa', 'ab', 'ac', etc.

### Grouping in as many buckets as needed

We can take this to a conclusion. Instead of keeping an arbitrary number of buckets, i.e. make buckets for the first characters or the first two characters, we can make as many buckets as we need for each word we add in the dictionary.

When we insert a new word to the dictionary, we make as many levels of buckets as we need to store the prefixes of the word. To store the word 'apple', we would store the prefixes: 'a', 'ap', 'app', 'appl', and 'apple'.

```javascript
function insert(dictionary, word) {
  // The initial bucket is the dictionary itself
  let bucket = dictionary;

  // For each character in the word...
  for (let i = 0; i < word.length - 1; i++) {
    const index = alphabet.indexOf(word[i]);

    // Create a new bucket for this character in the
    // current bucket if it doesn't already exist
    if (!bucket.children[index]) {
      bucket.children[index] = { isWord: false, children: new Array(26) };
    }

    // Set the current bucket for the next iteration
    bucket = bucket[index];
  }

  // Set the current bucket to be a word
  bucket.isWord = true;
}
```

Notice that we no longer need to keep the list of words for the prefixes, because they're stored in the relationships to other nodes instead.

To get the words starting with a prefix, we first find its corresponding node and then check for the words in all its children.

```js
function startsWith(dictionary, prefix) {
  let bucket = dictionary;
  for (let i = 0; i < prefix.length; i++) {
    const index = alphabet.indexOf(prefix[i]);
    if (!dictionary.children[index]) {
      return [];
    }

    bucket = dictionary.children[index];
  }

  // Get all the matches from this point, recursive...
}
```

> Another way to look at a trie is like a multi-leveled hash. For each character in the prefix, we ask: give me a hash to check if the next character exists.

> Ask Ayo what the runtime complexity of this is?

Another advantage using a trie gives us here is that it helps us automatically sort the list of returned words. Since we traverse the tree with the children ordered by the position of the character in the alphabet, the returned list of autocompleted words will be in alphabetical order.

## Suffix tries

In the previous section, we saw how to use a prefix tree, or _trie_, to quickly search through words in a dictionary. Prefix trees let us do interesting things like find words that start with a given prefix. But we can do even more interesting things with tries.

For example, let's say we wanted to check if see if some text exists _anywhere_ in a large text. For example, given the string 'ERTCSORN', we want to search for 'CSOR'. We can write out a list implementation of this algorithm:

```js
function substringList(text, substr) {
  for (let i = 0; i <= text.length - substr.length; i++) {
    let j = 0;

    for (j = 0; j < substr.length; j++) {
      if (text[i + j] !== substr[j]) break;
    }

    if (j === substr.length) return true;
  }

  return false;
}
```

To find whether the text contains the substring, we loop through the list of characters in the text, _O(n-m)_. Then at each character, we check to see if there is a match with the next characters starting from the current character, _O(m)_. Which gives us a runtime complexity of _O(m\*n)_.[^mfs] (m\*n because we expect n to be much smaller than m).

Another way to put what substringList is doing is that we loop through all the suffixes in the word and try to fing the occurence of the substring in each suffix.

For the string 'ERTCSORN', we check the following suffixes:

```js
['ERTCSORN', 'RTCSORN', 'TCSORN', 'CSORN', 'SORN', 'ORN', 'RN', 'N'];
```

The number of suffixes is `n` the length of the string, and for each prefix, we only need to check the first `n-m` suffixes. Which is how we get an `O(n-m)` performance.

But we seem to be in very familiar territory. We have a list of "words" in a list and we want to check for whether a word contains a prefix. We already know a good way to do this: the trie! We can add all the suffixes as words into a trie and then check the trie for the occurence of the prefix (the substring).

```js
function hasPrefix(dictionary, prefix) {
  let node = dictionary;
  for (let i = 0; i < prefix.length; i++) {
    const index = alphabet.indexOf(prefix[i]);
    if (!node.children[index]) return false;
    node = node.children[index];
  }

  return true;
}
```

As we've discussed earlier, the time complexity of finding the prefix in the tree is _O(l)_, where _l_ is the length of the prefix.

Let's recap what we've learned in this section. The problem was to write a program to find whether a given string contains a substring. We found that, using a list, we found that we could find the occurence of the substring in _O(m\*n)_ time, where m is the length of the text and n is the length of the substring. However, we found that instead, we can index the suffixes of the word into a trie. Then we can search for the substring through the suffix trie in _O(n)_ time.

Suffix tries take up a lot of space, by storing all the possible suffixes of the word. So a compressed version, known as the suffix tree, is used instead. Suffix trees have many applications in text editing, free-text search, and for finding patterns in DNA or protein sequences.
