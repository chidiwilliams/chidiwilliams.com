---
title: 'Writing Cleaner Go Web Servers'
date: 2020-05-01T00:00:00.000Z
draft: false
tags: [go]
description: Writing clean, high-quality code makes programs easier to understand, maintain, improve, and test. In this post, I share some tips for writing clean, effective Go web servers.
thumbnail: 'https://res.cloudinary.com/cwilliams/image/upload/c_scale,w_300/v1605275488/Blog/CleanArchitecture.webp'
images:
  [
    'https://res.cloudinary.com/cwilliams/image/upload/v1605275488/Blog/CleanArchitecture.webp',
  ]
categories: [go]
---

Writing clean, high-quality code makes programs easier to understand, maintain, improve, and test.

In this post, I will share some tips for writing clean, effective Go web servers. These tips are focused on issues related to architecture and error handling in Go.

A complete project containing all the examples is available on [GitHub](https://github.com/chidiwilliams/go-web-server-tips).

## Separate concerns with clean architecture

Clean architecture is a design pattern for separating concerns. Robert "Uncle Bob" Martin, in his book, [Clean Architecture: A Craftsman’s Guide to Software Structure and Design](https://www.amazon.com/Clean-Architecture-Craftsmans-Software-Structure/dp/0134494164), presents this architecture as a way of breaking up an application into loosely-coupled components.

<figure>
    <img src="https://res.cloudinary.com/cwilliams/image/upload/v1605275488/Blog/CleanArchitecture.webp" alt="Clean Architecture Diagram" />
    <figcaption>
    <p> <a href="https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html"> The Clean Architecture - Clean Coder </a> </p>
    </figcaption>
</figure>

The architecture divides the application into four main components.

The **entities** are the business models of the application. They describe the most general requirements of the system.

The **use cases** layer implements all the use cases in the system. It contains the application-specific business rules and describes how data flows from and to the entities.

The **interface adapters** layer converts data from **external agencies** (like the database or the Web) to the format most suitable for the use cases and entities. This layer contains controllers, presenters, and views.

The flow of control points inwards from the external agencies through the external interface adapters and use cases to the entities.

When writing Go web servers, I use the terminology of models as entities, services as use cases, repositories as interface adapters to data sources (e.g. database, external services, etc.), and handlers as interface adapters to the Web.

The handlers depend on and communicate with services, and services depend on repositories (typically one repository to a service at a time) to store and retrieve data.

For example, consider an application that saves data for a new book to an in-memory database:

```go
func CreateBook(w http.ResponseWriter, r *http.Request) {
    requestBody := createBookRequestBody{}
    if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
        writeError(w, err.Error(), http.StatusBadRequest)
        return
    }

    book := models.Book{
        ID: bson.NewObjectId(),
        Title: requestBody.Title,
        CreatedAt: time.Now().UTC(),
    }

    err := db.Update(func(tx *Tx) error {
        b, err := json.Marshal(&book)
        if err != nil {
            return err
        }

        _, _, err = tx.Set("books::"+book.ID.Hex(), string(b), nil)
        return err
    })
    if err != nil {
        writeError(w, err.Error(), http.StatusBadRequest)
        return
    }

    writeSuccess(w, book)
}
```

This handler function does a number of things: it decodes the HTTP request body, creates a new book, saves it to the database, and then responds to the client. Let's split this into a handler, service, and repository.

```go
// handlers/book/handler.go
func (h bookHandler) CreateBook(w http.ResponseWriter, r *http.Request) {
    requestBody := createBookRequestBody{}
    if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
        writeError(w, err.Error(), http.StatusBadRequest)
        return
    }

    book, err := h.bookService.CreateBook(requestBody.Title)
    if err != nil {
        writeError(w, err.Error(), http.StatusBadRequest)
        return
    }

    writeSuccess(w, book)
}

// services/book/service.go
func (s service) CreateBook(title string) (*models.Book, error) {
   book := models.Book{
       ID: bson.NewObjectId(),
       Title: title,
       CreatedAt: time.Now().UTC(),
    }
   if err := s.repository.CreateBook(book); err != nil {
      return nil, err
   }

   return &book, nil
}

// repository/inmemory.go
func (r inMemoryRepository) CreateBook(book models.Book) error {
    return r.db.Update(func(tx *buntdb.Tx) error {
        b, err := json.Marshal(&book)
        if err != nil {
            return err
        }

        _, _, err = tx.Set("books::"+book.ID.Hex(), string(b), nil)
        return err
    })
}
```

Now, we've created components that each perform only one function: one decodes the HTTP request and writes the response, another creates the data model, and the last one saves the data to the database.

Admittedly, this makes the code more verbose but it provides many advantages. Each component is easy to understand, easy to maintain, and reusable.

## Program to interfaces, not implementations

Instead of relying on the concrete implementation of a module, use an interface. Hide the inner workings of the module behind an interface and it becomes easier to modify the module without breaking other modules.

In the case of our application, the book service is hidden behind a `Service` interface and the in-memory database repository is hidden behind a `Repository` interface:

```go
// handlers/book/handler.go
func NewBookHandler(bookService book.Service) BookHandler {
    return bookHandler{bookService}
}

// services/book/service.go
type Service interface {
    CreateBook(title string) (*models.Book, error)
}

func NewService(repository repository.Repository) Service {
    return service{repository}
}

// repository/repository.go
type Repository interface {
    CreateBook(book models.Book) error
}

// repository/inmemory.go
func NewInMemoryRepository(db *db.Client) Repository {
    return inMemoryRepository{db}
}
```

By loosening the decoupling of the different components in this way, changes to the repository module will not affect the service layer as long as the interface is satisfied, and so on. This makes the application easier to maintain.

Programming to interfaces also makes it easier to test the different layers of the application independently. For example, in a unit test for the book service, we may supply a mock implementation of the book repository instead of the concrete `inMemoryDatabaseRepository`.

Interfaces also make it easier to swap out dependencies. If we decide to change our data store to MongoDB, we only need to write the adapter (`mongoRepository`) and then change the repository implementation to be used at runtime.

```go
// repository/mongo.go
func NewMongoRepository(db *mgo.Database) Repository {
    return mongoRepository{coll: db.C("books")}
}

func (m mongoRepository) CreateBook(book models.Book) error {
    return m.coll.Insert(book)
}

// server.go
bookRepository := repository.NewMongoRepository(mongoDB)
// bookRepository := repository.NewInMemoryRepository(inMemoryDB)
bookService := book.NewService(bookRepository)
bookHandler = books.NewBookHandler(bookService)
```

## Simplify error handling with a custom HTTP handler

Let's revisit the book handler function. When an error occurs, the handler returns an error message to the user along with an HTTP status code.

```go
func (h bookHandler) CreateBook(w http.ResponseWriter, r *http.Request) {
    requestBody := createBookRequestBody{}
    if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
        writeError(w, err.Error(), http.StatusBadRequest)
        return
    }

    book, err := h.bookService.CreateBook(requestBody.Title)
    if err != nil {
        writeError(w, err.Error(), http.StatusBadRequest)
        return
    }

    writeSuccess(w, book)
}
```

As we add more HTTP handlers, this explicit error handling becomes undesirably repetitive. To keep the application DRY, we can define a custom HTTP handler type that returns an error.

```go
type Handler func(w http.ResponseWriter, r *http.Request) error
```

Then we can change the `createBook` handler to return errors:

```go
func (h bookHandler) CreateBook(w http.ResponseWriter, r *http.Request) error {
    requestBody := createBookRequestBody{}
    if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
        return err
    }

    book, err := h.bookService.CreateBook(requestBody.Title)
    if err != nil {
        return err
    }

    writeSuccess(w, book)
    return nil
}
```

To use our `Handler` type with the http package, we need to implement the `http.Handler` interface's `ServeHTTP` method:

```go
func (h Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    if err := h(w, r); err != nil {
        writeError(w, err.Error(), http.StatusBadRequest)
    }
}
```

Finally, to register the handler to its route, we convert the handler function to the `Handler` type:

```go
http.Handle("/book", handlers.Handler(bookHandler.CreateBook))
```

## Use custom errors for client errors

To make the application more user-friendly, we should return the error message with an appropriate HTTP status code.

We also need to differentiate errors which should be returned to the client (client errors) from those which should not (server errors).

**Client errors** are errors related to the request, such as validation, authentication, and permission errors.

**Server errors** are issues with the internal workings of the application, for example, errors that occur while connecting to the database or an external remote service.

Server errors may contain sensitive information about the database or file system, and for this reason, when they occur, we want to respond with an HTTP 500 Internal Server Error.

To do this, we may create a custom error type containing a message and a type.

```go
type Type string

type AppError struct {
    text    string
    errType Type
}

func (e AppError) Error() string {
    return e.text
}
```

To create a HTTP 400-like error, we use a new `AppError` with a `TypeBadRequestError` type:

```go
// handlers/book/handler.go
func (u handler) GetBook(w http.ResponseWriter, r *http.Request) error {
    // ...

    if ... {
        return errors.Error("invalid vendor ID")
    }

    // ...
}

// errors/error.go
const (
    TypeBadRequest Type = "bad_request_error"
    TypeNotFound Type = "not_found_error"
)

func Error(text string) error {
    return &AppError{text: text, errType: TypeBadRequest}
}
```

In the `ServeHTTP` method, we can now improve error handling. If the error matches the custom `AppError` type, we return the error message with the HTTP status code corresponding to the error's type. If the error is not an `AppError`, we assume that it is a server error, return an HTTP 500 response, and log the full error for debugging.

```go
func (h Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    err := h(w, r)
    if err == nil {
        return
    }

    appError := new(errors2.AppError)
    if errors.As(err, &appError) { // client error
        writeError(w, err.Error(), errTypeStatusCode(appError.Type()))
        return
    }

    // server error
    log.Println("server error:", err)
    writeError(w, "Internal Server Error", http.StatusInternalServerError)
}
```

## Standardize HTTP response format

Use a response struct to make the server response consistent and predictable.

A simple response format may contain fields for a "success" flag, a display/error message, and data to be returned to the client. Depending on your application, you may need more fields in the response body.

```go
type response struct {
    Body       *responseBody
    StatusCode int
}

type responseBody struct {
    Success bool        `json:"success"`
    Message string      `json:"message,omitempty"`
    Data    interface{} `json:"data,omitempty"`
}

func (r response) ToJSON(w http.ResponseWriter) error {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(r.StatusCode)
    return json.NewEncoder(w).Encode(r.Body)
}

func OK(message string, data interface{}) *response {
    return &response{&responseBody{Message: message, Data: data}, http.StatusOK}
}

func Fail(message string, statusCode int) *response {
    return &response{&responseBody{Message: message}, statusCode}
}
```

To use the response struct in the handlers:

```go
// handlers/book/handler.go
type getBookResponse struct {
    Book *models.Book `json:"book"`
}

func (u handler) GetBook(w http.ResponseWriter, r *http.Request) error {
    // ...
    return responses.OK("We found your book!", getBookResponse{retrievedBook}).ToJSON(w)
}

// handlers/handler.go
func (h Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // ...

    if errors.As(err, &appError) { // client error
        responses.Fail(err.Error(), errTypeStatusCode(appError.Type())).ToJSON(w)
        return
    }

    // server error
    log.Println("server error:", err)
    responses.Fail("Internal Server Error", http.StatusInternalServerError).ToJSON(w)
}
```

## Conclusion

The tips contained in this post are not exhaustive. There might be alternative and better solutions depending on your application but these recommendations can serve as a guide and starting point for writing more effective Go servers.
