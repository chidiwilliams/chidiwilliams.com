---
title: 'Inside a Go Slice'
date: 2020-11-19T03:59:54+01:00
draft: false
tags: [go]
---

Two weeks ago, a friend of mine, who is learning to write Go, asked me to explain the output of this snippet.

```go
func main() {
	nums := []int{1, 2, 3}
	loopNums(nums)
}

func loopNums(nums []int) {
	for i := 0; i < 5; i++ {
		fmt.Println(shiftNums(nums))
	}
}

func shiftNums(nums []int) int {
	first := nums[0]
	nums = append(nums[:0], nums[1:]...)
	return first
}
```

If you learned to write a language like Python or JavaScript before learning to write Go, as my friend did, it is tempting to try to interpret Go code by first translating it into one of those languages.

Here's what a naive translation of the Go snippet to JavaScript might look like.

```javascript
function main() {
  const nums = [1, 2, 3];
  loopNums(nums);
}

function loopNums(nums) {
  for (let i = 0; i < 5; i++) {
    console.log(shiftNums(nums));
  }
}

function shiftNums(nums) {
  const first = nums[0];
  nums = nums.slice(0, 0).concat(nums.slice(1));
  return first;
}

// Output:
// 1
// 1
// 1
// 1
// 1
```

On each iteration, `shiftNums`:

- extracts the first element of `nums`,
- concatenates the first zero elements and the last two elements of `nums`, and then
- returns the initial first element

`slice()` and `concat()` both return new arrays, so the value of `nums` in `loopNums` remains unchanged after each iteration. And the program continues to print out the first element in the original array: `1`.

The Go program, however, has a different output. Because though Go slices are similar to arrays in other languages, they have a few unusual properties. We'll explore these properties.

```go
// 1
// 2
// 3
// 3
// 3
```

A Go slice describes a section of an underlying array. To understand how slices work, we first need to know how arrays in Go work.

## Arrays

An array is a collection of elements of the same type with continuous memory.

We define an array type with a length and the element type. For example, `[3]string` represents an array of three strings.

The size of an array is fixed and its length is part of its type. `[3]string` and `[4]string` are distinct, incompatible types. Therefore, the following program will not compile:

```go
var a [4]int
b := [5]int{10, 20, 30, 40, 50}
a = b
// cannot use b (type [5]int) as type [4]int in assignment
```

Go arrays are values. Assigning or passing around an array copies its contents.

```go
a := [3]int{10, 20, 30}
b := a
b[0] = 50
// a == [10 20 30]
// b == [50 20 30]
```

## Slices

A slice is a wrapper over an array that provides more flexibility.

A slice type has no defined length. We declare slice literals just like array literals, but without the element count.

```go
n := []int{1, 2, 3, 4}
```

We can also create a slice with the built-in function, `make`. `make` takes in a type, a length, and an optional capacity. And it allocates an array of that type and returns a slice that points to that array.

```go
s := make([]string, 3, 4) // []int{0, 0, 0}
```

The **length** of a slice is the number of elements in the slice. The **capacity** of a slice is the maximum length to which we can grow the slice.

We can check the length and capacity of a slice using the built-in functions, `len` and `cap`.

```go
len(s) == 3
cap(s) == 4
```

The zero value of a slice is `nil`. The length and capacity of a `nil` slice are both zero.

```go
var s []int // s == nil, len(s) == 0, cap(s) == 0
```

We'll discuss the relationship between the length and capacity of a slice in more detail in the next sections.

## Slice expressions

Besides slice literals and `make`, we can also create a slice by "slicing" an array or "re-slicing" another slice.

If we create a slice by slicing an array, the new slice points to that array. If we create a slice by re-slicing an existing slice, the new slice points to the same array as the original slice.

We use slice expressions to slice arrays and re-slice slices.

Slice expressions have two variants: **simple slice expressions** that specify a low and high bound, and **full slice expressions** that also specify a bound on the capacity.

### Simple slice expressions

The expression `a[low:high]` constructs a slice containing the elements between the low (inclusive) and high indices. The length of the slice will be `high - low`.

```go
a := [5]int{1, 2, 3, 4, 5}
// Slice array a to form slice s
s := a[1:4] // [2 3 4]

b := []string{"a", "b", "c", "d"}
// Re-slice slice b to form slice t
t := b[2:4] // ["c" "d"]
```

A missing low index defaults to zero, and a missing high index defaults to the length of the original array or slice.

```go
a[1:] // same as a[1:len(a)]
a[:2] // same as a[0:2]
a[:]  // same as a[0:len(a)]
```

If the low index is less than zero, Go will report a compile error. If the high index is greater than the capacity of the operand, Go will panic with a runtime error.

```go
a := make([]int, 3)
b := a[-1:2]
// invalid slice index -1 (index must be non-negative)

b := a[2:5]
// panic: runtime error: slice bounds out of range [2:5] with capacity 3
```

If the sliced operand of a valid slice expression is a `nil` slice, the result is a `nil` slice.

```go
var x []int
y := x[:] // y == nil
```

### Full slice expressions

Full slice expressions also contain a `max` value in addition to the `low` and `high` indices.

These expressions work in the same way as simple slice expressions, except that they also set the capacity of the resulting slice to `max - low`.

```go
a := [5]int{1, 2, 3, 4, 5}
t := a[1:3:5] // t == [2 3], cap(t) == 4
```

Next, we'll explore the relationship between the length and capacity of a slice.

## Length and capacity

As we have already discussed, a slice is a descriptor of an array segment. The length of the slice is the number of elements in the segment. And the capacity of the slice is the maximum length to which we can grow the segment.

![Length and capacity of a Go slice](https://res.cloudinary.com/cwilliams/image/upload/v1605754974/Blog/inside-a-go-slice-len-cap.png)

Re-slicing a slice does not copy the slice's data. It creates a slice value that points to the original array.

![Re-slicing a Go slice](https://res.cloudinary.com/cwilliams/image/upload/v1605754968/Blog/inside-a-go-slice-reslice.png)

Therefore, modifying the elements of a re-slice modifies the elements of the original slice.

```go
a := []int{10, 20, 30, 40, 50} // [10 20 30 40 50]
b := a[:2]                     // [10 20]
b[1] = 23                      // b == [10 23], a == [10 23 30 40 50]
```

We can grow a slice to its capacity by slicing it again. However, a slice cannot grow beyond its capacity. And we cannot re-slice a slice below zero to access earlier elements in the array.

```go
a := []int{10, 20, 30, 40, 50} // [10 20 30 40 50]
b := a[1:3]                    // b == [20 30], cap(b) == 4
b := b[:cap(b)]                // b == [20 30 40 50]

// Trying to access the first element (10) in the
// array causes a compilation error:
// invalid slice index -1 (index must be non-negative)
b := b[-1:]
```

## Copy and append

To increase the capacity of a slice, we create a larger slice and copy the contents of the original slice into it.

```go
a := []int{10, 20, 30}             // a == [10 20 30], cap(a) == 3
b := make([]int, len(a), cap(a)*2) // b == [0 0 0], cap(b) == 6
for i, v := range a {
	b[i] = v
}
// b == [10 20 30], cap(b) == 6
```

We can then write a function that appends values to a slice, growing the slice if necessary.

```go
func AppendInts(slice []int, newElements ...int) []int {
	oldLen := len(slice)
	newLen := oldLen + len(newElements)
	if newLen > cap(slice) {
		newSlice := make([]int, newLen*2)
		// copy is a built-in function that copies one slice to another
		copy(newSlice, slice)
		slice = newSlice
	}
	slice = slice[:newLen]
	copy(slice[oldLen:newLen], newElements)
	return slice
}
```

We grow the size of the slice by a large amount (2x) so that we don't have to grow it each time we append a new element [1].

Go provides this functionality for growing arrays with its built-in `append` function.

The function appends elements to the end of a slice. If the slice has sufficient capacity, it re-slices the final slice to accommodate the new elements. If not, it will create a new array and insert the original and new elements. `append` returns the updated slice.

```go
a := make([]int, 0, 3) // a == [], cap(a) == 3
a = append(a, 1, 2, 3) // a == [1 2 3], cap(a) == 3
a = append(a, 4)       // a == [1 2 3 4], cap(a) == 6

// Appending to a nil slice...
var c []int           // c == [], cap(a) == 0
c = append(c, 10, 20) // c == [10 20], cap(c) == 2
```

## Modifying slices

Remember that a slice points to an underlying array.

If we modify the elements of a slice, it also modifies the elements in the underlying array. And the changes will be visible to all other slices that point to that same array segment.

```go
a := []int{10, 20, 30, 40, 50} // [10 20 30 40 50]
b := a[:3]                     // b == [10 20 30], cap(b) == 5

// Appending one element to b will not allocate a new array
// because b has enough capacity.
// append adds the element to the end of the slice (index 3
// in the underlying array) and the change is visible to a.
b = append(b, 34)

// b == [10 20 30 34], cap(b) == 5
// a == [10 20 30 34 50]

// Appending two more elements to b will allocate a new array
// because b does not have enough capacity.
// append will copy the existing and new elements into the new
// array, so these changes will not be visible to a.
b = append(b, 10, 49)

// b == [10 20 30 34 10 49]
// a == [10 20 30 34 50]
```

If a function receives a slice argument, changes to the elements of the slice will be visible to the caller.

```go
func main() {
	a := make([]int, 5)
	modifySlice(a)
	// a == [0 0 0 45 0]
}

func modifySlice(s []int) {
	b := s[:3]
	// Appending to b adds the element to the end of the
	// slice (index 3 in the underlying array) and the change
	// is visible to a.
	b = append(b, 45) // b == [0 0 0 45]
}
```

## Review

With all we've learned so far, we're ready to review the snippet at the beginning of this post.

```go
func main() {
	nums := []int{1, 2, 3}
	loopNums(nums)
}

func loopNums(nums []int) {
	for i := 0; i < 5; i++ {
		fmt.Println(shiftNums(nums))
	}
}

func shiftNums(nums []int) int {
	first := nums[0]
	nums = append(nums[:0], nums[1:]...)
	return first
}

// Output:
// 1
// 2
// 3
// 3
// 3
```

`shiftNums` appends `nums[1:]...` to `nums[:0]`, assigns the result to `nums`, and then returns the first element in the initial `nums` slice.

Let's take a closer look at the `append` expression.

The first argument to `append` is `nums[:0]`. `nums[:0]` returns a slice that points to the same array as `nums`. The slice contains zero elements, counting from the first element in `nums`. It has a value of `[]`, a length of 0, and a capacity of 3.

The second argument to `append` is `nums[1:]...`, which spreads all the elements in `nums` except the first.

In the first iteration, the value of `nums` is `[1 2 3]`. Appending `nums[:0]` and `nums[1:]...` will store the second and third elements of `nums` (`2` and `3`) in indexes `0` and `1` of the underlying array. (We assign the resulting slice to `nums`, but this assignment has no further effect.)

`loopNums` then prints the return value (`1`) to the console.

The modification to the underlying array is visible to `nums` in `loopNums`, and the value of `nums` before the second iteration is `[2 3 3]`.

In the second iteration, calling `append` stores the second and third elements of `nums` (`3` and `3`) in indexes `0` and `1` of the array. The next value of `nums` in `loopNums` is `[3 3 3]`. And the program prints `2` to the console.

For each iteration after this point, the value of `nums` in `loopNums` will remain `[3 3 3]`, and the program will continue to print `3`.

## Conclusion

Because they grow dynamically and make copies only when needed, slices provide a lot of flexibility and efficiency when working with sequences of data in Go.

---

## Notes

[1] This technique of growing an array by copying to a new, larger array is the same way dynamic arrays work in languages like Python and Java. The rate of growing the new arrays, the **growth factor**, is typically around 1.5 - 2.
