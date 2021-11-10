---
title: 'Text Search with Tries'
date: 2021-11-10T00:06:52Z
draft: true
series: [Data Structures and Algorithms in the Wild]
---

In the [previous post](/post/quadtrees/) in the [Data Structures and Algorithms in the Wild](/series/data-structures-and-algorithms-in-the-wild/) series, we explored the quadtree, a tree data structure used to index locations in two-dimensionsional space.

In this post, we'll look into another data structure called the _trie_. Like the quadtree, the trie is also a tree structure. But, while quadtrees search through locations, tries search through text.

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

To find the matches in this program, we check every word in the dictionary. And, for each word, we check whether it matches the prefix. Consequently, the runtime complexity of the program is _O(m\*n)_, where `m` is the number of words in the dictionary and `n` is the length of the prefix.

### Grouping by the first character

In the previous post on quadtrees, we learned that we can improve search performance by grouping related entities together. Let's see if a similar technique can help us in this case.

Instead of putting all the words in one list, we can group the words by their first characters. All words starting with 'a' will be in one list, 'b' in another list, and so on. We can think of each group as a child dictionary.

 <!-- TODO: Talk about the unstated assumption that we would make insertion more difficult vs making search easier -->

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

If we assume that the words are evenly distributed among the child dictionaries, the time complexity of this implementation will be _O(1 + n\*(m/26))_. We check for the correct child dictionary in constant time, _O(1)_. Then we compare the prefix with the words in a child dictionary 1/26 times the size of the entire dictionary, giving _O(n\*(m/26))_.

### Grouping by the first two characters

The performance of the the current implementation, _O(1 + n\*(m/26))_, is already better than what we started with, _O(n\*m)_. But we can do even better.

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

As before, to find the words beginning with a prefix, we search through the correct child dictionary:

```javascript
function startsWith(dictionary, prefix) {
  const child = dictionary[alphabet.indexOf(prefix[0])][alphabet.indexOf(prefix[1])];
  return getMatches(child, prefix);
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
>
> TODO: How tries get their names

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
