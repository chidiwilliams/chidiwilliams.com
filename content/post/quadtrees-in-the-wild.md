---
title: 'Quadtrees in the Wild'
date: 2021-09-07T08:49:21+01:00
draft: true
url: quadtrees
---

The phrase "data structures and algorithms" brings to mind unnerving programming interviews, tedious Computer Science lectures, and strange-looking code nobody ever seems to use in the real world. But we use data structures and algorithms all the time. When we store, retrieve, or process data in a program, we make use of data structures and algorithms.

These data structures and algorithms perform differently in different situations. One data structure can store data faster, but retrieve the data slower, compared to another data structure. And, for the same operation, one algorithm can perform faster on average, but slower in important edge cases, than another algorithm.

For this reason, choosing good data structures and algorithms can have a significant impact on the performance of a program. And learning about the performance benefits and [tradeoffs](/tradeoffs/) can help us write better programs that solve problems more efficiently.

Starting with this post, I'll be writing a series called "Data Structures and Algorithms in the Wild". Throughout the series, we'll look at different programming problems to learn how to choose good data structures and algorithms to solve techincal problems.

## Why we use quadtrees

We'll start with a data structure called the quadtree, a tree structure where each node in the tree has four child nodes. To understand how quadtrees work and why they are useful, let's see an example.

Say we have an app that shows a user the locations of grocery stores close to them. A store signs up by submitting its location. And when a user opens the app, they see all the stores within a certain distance from their current location.

Given the locations of all the stores, can we write a program that returns all the points within a boundary?

{{<iframefigure src="https://chidiwilliams.github.io/dsaw/quadtrees/1.html" caption="Click anywhere to find points within a boundary" height="315px" >}}

One quick approach could be to keep all the store locations in a list of points. To find the points within a boundary, we loop over the list and return all the points within the boundary.

```js
function insert(points, point) {
  points.push(point);
}

function search(points, boundary) {
  return points.filter((point) => contains(boundary, point));
}

function contains(boundary, point) {
  return (
    point.x >= boundary.topLeft.x && // not too left
    point.x <= boundary.bottomRight.x && // not too right
    point.y >= boundary.topLeft.y && // not too top
    point.y <= boundary.bottomRight.y // not too bottom
  );
}

const points = [];
insert(points, { x: 1, y: 5 });
insert(points, { x: 2, y: 1 });
insert(points, { x: 3, y: 0 });
search(points, { topLeft: { x: 0, y: 4 }, bottomRight: { x: 4, y: 8 } });
// [{ x: 2, y: 1 }, { x: 2, y: 4 }]
```

This `search` function has a runtime complexity of _O(n)_. Because we loop through all the points, the time it takes to find points within a boundary increases linearly with the total number of points.

But what if we split up the space into sections? This way, we only need to search the sections that intersect with the search boundary, and we can ignore the other sections.

{{<iframefigure src="https://chidiwilliams.github.io/dsaw/quadtrees/2.html" caption="Click anywhere to find points within a boundary. Only the points in sections that intersect with the search boundary (marked orange) are checked" height="315px" >}}

This is essentially how quadtrees work. We start by adding points to the root node of the quadtree, which defines the entire possible space. When the number of points in the node reaches a predefined maximum capacity, it splits into four child nodes. And when any of those nodes reaches the maximum capacity of points, it splits again into four child nodes, and so on.

{{<iframefigure src="https://chidiwilliams.github.io/dsaw/quadtrees/3.html" caption="Each section contains at most four points, after which it splits into four child sections. Sections with darker shades are deeper in the quadtree." height="345px" >}}

<!-- Compared to a list, it takes more time to insert a new point into a quadtree, because we need to find the correct section (the correct node) to place the point in. The quadtree also takes up more space than a list, because we store extra information about the position of each node. But on the other hand, it takes much less time to find the points inside a search boundary. -->

## Points within a boundary

To insert a point into a quadtree, we first check if the node has the capacity to receive the point. If it does, we save the point in that node. But if it doesn't, we split the node into four sections and then insert the point into the section it falls into.

 <!-- When would a quadtree be good or bad? In the worst case, all the points are close to each other, and the quadtree behaves like a list. In the best case, the points are scattered sparsely across the entire space, and we can exclude many points from the search. -->

```js
function insert(node, point) {
  // If the point is outside the node's boundary, return false
  if (!contains(node.boundary, point)) {
    return false;
  }

  // If this node has not yet reached its capacity and has not
  // yet been subdivided, insert the point into this node
  if (node.points.length < NODE_CAPACITY && !node.topLeftChild) {
    node.points.push(point);
    return true;
  }

  // At this point, the node has either already been subdivided,
  // or has reached its capacity but hasn't been subdivided

  // If the node has reached its capacity,
  // but hasn't been subdivided, subdivide
  if (!node.topLeftChild) {
    subdivide(node);
  }

  // Insert the point into its correct child node. We can try inserting
  // into all the child nodes. The wrong ones (where the point's position
  // is outside the child node's boundary) would simply return false,
  // until we find the correct child node.
  if (insert(node.topLeftChild, point)) return true;
  if (insert(node.bottomLeftChild, point)) return true;
  if (insert(node.topRightChild, point)) return true;
  if (insert(node.bottomRightChild, point)) return true;

  // We shouldn't ever get to this point, though
  return false;
}

const quadtree = {
  boundary: {
    topLeft: { x: 0, y: 0 },
    bottomRight: { x: 8, y: 8 },
  },
  points: [],
};
insert(quadtree, { x: 1, y: 1 });
insert(quadtree, { x: 3, y: 7 });
```

To subdivide a node into its child nodes, we split the node's area into four section. Then, we add the existing points in the node into the correct child node.

```js
function subdivide(node) {
  const { topLeft, bottomRight } = node.boundary;
  const midPoint = {
    x: (topLeft.x + bottomRight.x) / 2,
    y: (topLeft.y + bottomRight.y) / 2,
  };

  // Create the four child nodes
  node.topLeftChild = createNode(
    { x: topLeft.x, y: topLeft.y },
    { x: midPoint.x, y: midPoint.y }
  );
  node.bottomLeftChild = createNode(
    { x: topLeft.x, y: midPoint.y },
    { x: midPoint.x, y: bottomRight.y }
  );
  node.topRightChild = createNode(
    { x: midPoint.x, y: topLeft.y },
    { x: bottomRight.x, y: midPoint.y }
  );
  node.bottomRightChild = createNode(
    { x: midPoint.x, y: midPoint.y },
    { x: bottomRight.x, y: bottomRight.y }
  );

  // Move the points in the node to the child node that should contain the point.
  // Again, we can try inserting each point into all the child nodes. The wrong ones
  // (where the point's position is outside the child node's boundary) would simply
  // return false, until we find the correct child node.
  node.points.forEach((point) => {
    if (insert(node.topLeftChild, point)) return;
    if (insert(node.bottomLeftChild, point)) return;
    if (insert(node.topRightChild, point)) return;
    if (insert(node.bottomRightChild, point)) return;
  });

  node.points = [];
}

function createNode(topLeft, bottomRight) {
  return { boundary: { topLeft, bottomRight }, points: [] };
}
```

Now, we can write the `search` function. Given a boundary, the function will look through all nodes that intersects with the boundary and return all points in those nodes that fall into the search boundary.

```js
function search(node, boundary) {
  // If this node does not intersect with the search boundary, we know that
  // the node and all its child nodes do not contain any points that fall
  // into the search boundary
  if (!intersects(node.boundary, boundary)) {
    return [];
  }

  // If this node has not yet been subdivided, return
  // all the points within the search boundary
  if (!node.topLeftChild) {
    return node.points.filter((point) => contains(boundary, point));
  }

  // If the node has been subdivided, search all
  // the child nodes and merge the results
  return search(node.topLeftChild, boundary)
    .concat(search(node.bottomLeftChild, boundary))
    .concat(search(node.topRightChild, boundary))
    .concat(search(node.bottomRightChild, boundary));
}
```

By first checking whether the node's boundary intersects with the search boundary, we can skip over large sections of space we don't need to search.

![The time it takes to find points within a boundary grows slower with a quadtree than with a list](https://res.cloudinary.com/cwilliams/image/upload/v1631579887/Blog/Finding_points_within_a_boundary.png)

Consequently, quadtrees perform best when the data points are fairly evenly scattered. If most of the points are positioned close to one another, the quadtree becomes _unbalanced_ (i.e. some branches will be much longer than others). And the performance of `search` will tend closer towards the linear runtime complexity we previously saw with the list.

## Nearest point to a location

Returning to our store finder app, say we want to show the user the nearest store to them. If we store the points in a list, it takes linear time to perform this task.

```js
function nearest(points, location) {
  let nearestPoint;
  let nearestPointDistance = Number.MAX_VALUE;

  points.forEach((point) => {
    const dist = distance(point, location);
    if (dist < nearestPointDistance) {
      nearestPoint = point;
      nearestPointDistance = dist;
    }
  });

  return nearestPoint;
}

// Returns the Euclidean distance between two points
function distance(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}
```

Alternatively, with a quadtree, we can check the smallest section (the deepest node in the tree) which surrounds the search location first. This node would likely have points that are very close to the search location. Then, when we check through the rest of the tree, we can exclude sections that are too far away without even checking their sub-sections and points.[^snk]

{{<iframefigure src="https://chidiwilliams.github.io/dsaw/quadtrees/5.html" height="315px" caption="Click anywhere to find the nearest neighbour (shown in red). Green sections are visited, with saturation indicating depth in the quadtree. Only the orange points are checked. The other sections are excluded with a distance test.">}}

We follow a few steps:

- At each node of the quadtree, we check to see if the node has been subdivided.
- If it has, we recursively check its child nodes. Importantly, we'll check the child node that contains the search location first, before checking the other child nodes.
- When we get to a node that has not been subdivided, we'll loop through all its points and return the point nearest to the search location.
- As we recurse back up the tree, when we get to a node that is farther away than the nearest point we've found, we can safely discard that section without checking its subsections or points.

```js
function nearest(node, location, nearestPoint) {
  // If this node is farther away than the nearest point,
  // no need to check here or any of its child nodes
  if (
    location.x < node.boundary.topLeft.x - nearestPoint.distance || // location too left
    location.x > node.boundary.bottomRight.x + nearestPoint.distance || // location too right
    location.y < node.boundary.topLeft.y - nearestPoint.distance || // location too top
    location.y > node.boundary.bottomRight.y + nearestPoint.distance // location too bottom
  ) {
    return nearestPoint;
  }

  // Not yet subdivided, return the nearest point in this node
  if (!node.topLeftChild) {
    node.points.forEach((point) => {
      const d = distance(point, location);
      if (d < nearestPoint.distance) {
        nearestPoint.point = point;
        nearestPoint.distance = d;
      }
    });
    return nearestPoint;
  }

  // Since this node has already been subdivided, check all its child nodes.
  // Check the child node where the location falls first, before checking
  // the adjacent nodes, and then the opposite node.

  const childNodes = [
    node.topLeftChild,
    node.topRightChild,
    node.bottomLeftChild,
    node.bottomRightChild,
  ];

  // True if location is at the top half of this node's boundary
  const tb = location.y < (node.boundary.topLeft.y + node.boundary.bottomRight.y) / 2;
  // True if location is at the left half of this node's boundary
  const lr = location.x < (node.boundary.topLeft.x + node.boundary.bottomRight.x) / 2;

  // containing node
  nearestPoint = nearest(childNodes[2 * (1 - tb) + 1 * (1 - lr)], location, nearestPoint);
  // adjacent node
  nearestPoint = nearest(childNodes[2 * (1 - tb) + 1 * lr], location, nearestPoint);
  // adjacent node
  nearestPoint = nearest(childNodes[2 * tb + 1 * (1 - lr)], location, nearestPoint);
  // opposite node
  nearestPoint = nearest(childNodes[2 * tb + 1 * lr], location, nearestPoint);

  return nearestPoint;
}
```

(To get the containing, adjacent, and opposite nodes, we use the top-bottom and left-right positions of the search location.)[^ksl]

![The time it takes to find the nearest point grows slower with a quadtree than with a list](https://res.cloudinary.com/cwilliams/image/upload/v1631630410/Blog/Finding_the_nearest_neighbour.png)

## Image compression

Quadtrees can also be used to compress pictures. The algorithm works in four steps:

1. Split up the image into four sections.
2. Calculate the amount of _error_ in each section. For each pixel in the section, calculate the difference between the color of the pixel and the average color of the entire section. The average of all the differences will be the error in the section.
3. If the error in a section exceeds some predefined maximum value, split the section into four child sections and repeat step 2.
4. At the end of the process, each quadtree node will contain the average color (within the specified error limit) of some section of the compressed image.[^djc]

Converting this into code:

```js
function compress(pixels, w, h, node, maxError) {
  const avg = average(pixels, w, h);
  const err = error(pixels, w, h, avg);

  // If the node has less than the maximum allowed error,
  // store the color and error values in the node
  if (err < maxError) {
    node.color = avg;
    node.error = err;
    return;
  }

  // If the node has more than the maximum allowed error,
  // split the node into child nodes and compress each child node

  const { topLeft, bottomRight } = node.boundary;
  const midPoint = {
    x: Math.floor((topLeft.x + bottomRight.x) / 2),
    y: Math.floor((topLeft.y + bottomRight.y) / 2),
  };

  node.children = [
    // Top-left
    createNode({ x: topLeft.x, y: topLeft.y }, { x: midPoint.x, y: midPoint.y }),
    // Bottom-left
    createNode({ x: topLeft.x, y: midPoint.y + 1 }, { x: midPoint.x, y: bottomRight.y }),
    // Top-right
    createNode({ x: midPoint.x + 1, y: topLeft.y }, { x: bottomRight.x, y: midPoint.y }),
    // Bottom-right
    createNode(
      { x: midPoint.x + 1, y: midPoint.y + 1 },
      { x: bottomRight.x, y: bottomRight.y }
    ),
  ];

  node.children.forEach((child) => {
    const startx = child.boundary.topLeft.x - topLeft.x;
    const endx = child.boundary.bottomRight.x - topLeft.x;
    const starty = child.boundary.topLeft.y - topLeft.y;
    const endy = child.boundary.bottomRight.y - topLeft.y;
    const childPixels = slice2d(pixels, startx, endx, starty, endy);

    const childW = midPoint.x - topLeft.x;
    const childH = midPoint.y - topLeft.y;

    compress(childPixels, childW, childH, child, maxError);
  });
}
```

By varying the maximum amount of error in each section, we can change the amount of compression done to the image:

{{<iframefigure src="https://chidiwilliams.github.io/dsaw/quadtrees/4.html" height="370px">}}

---

The complete code for the examples in this post are available [on GitHub](https://github.com/chidiwilliams/dsaw/).

## Notes

[^snk]: Adapted from Patrick Surry's [D3JS quadtree nearest neighbor algorithm](http://bl.ocks.org/patricksurry/6478178)
[^ksl]:
    Here, we're trying to find the containing, adjacent, and opposite nodes, given the top-bottom and left-right positions.

    First, we split the grid into four quadrants: top-left, top-right, bottom-left, and bottom-right. We can represent the value of "top" with 1 and "bottom" with 0, and "left" with 1 and "right" with 0. The quadrants become:

    |                  |                   |
    | ---------------- | ----------------- |
    | 11 (top-left)    | 10 (top-right)    |
    | 01 (bottom-left) | 00 (bottom-right) |

[^djc]: This type of quadtree, where each node covers a region and a data value corresponding to the region, is called a [region quadtree](https://en.wikipedia.org/wiki/Quadtree#Region_quadtree). The quadtree we used in the first two sections is a [point-region (PR) quadtree](<https://en.wikipedia.org/wiki/Quadtree#Point-region_(PR)_quadtree>). A point-region quadtree is similar to a region quadtree, but each region holds items up to a predefined capacity before splitting.
