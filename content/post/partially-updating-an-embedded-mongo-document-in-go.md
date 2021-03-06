---
title: "Partially updating an embedded Mongo document in Go"
date: 2020-05-21T19:12:50Z
draft: false
tags: [go, mongo]
---

Let's consider a Go application that stores a user's name and address information in MongoDB.

We can represent the database model with the following structs:

```go
type User struct {
  ID      bson.ObjectID `bson:"_id,omitempty"`
  Name    string        `bson:"name,omitempty"`
  Address Address       `bson:"address,omitempty"`
}

type Address struct {
  Street    string    `bson:"street,omitempty"`
  City      string    `bson:"city,omitempty"`
  State     string    `bson:"state,omitempty"`
  VisitedAt time.Time `bson:"visitedAt,omitempty"`
}
```

To save a new user document, we call the collection's `Insert` method, passing in the user struct.

```go
db.C("users").Insert(User{
  ID:   bson.NewObjectID(),
  Name: "Buffy Summers",
  Address: Address{
    Street: "1630 Revello Drive",
    City:   "Sunnydale",
    State:  "CA",
  },
})
```

This creates a MongoDB document with an embedded document at the `address` field:

```js
{
    "_id" : ObjectId("5ec50eaaceb41275cce6a0cc"),
    "name" : "Buffy Summers",
    "address" : {
        "street" : "1630 Revello Drive",
        "city" : "Sunnydale",
        "state" : "CA"
    }
}
```

After visiting Buffy in her home in Sunnydale, we want to update the `VisitedAt` field of the address embedded document. To do this, we would call the collection's `UpdateId` function:

```go
db.C("users").UpdateId(id, User{Address: {VisitedAt: time.Now().UTC()}})
```

The Mongo document then becomes:

```js
{
    "_id" : ObjectId("5ec50eaaceb41275cce6a0cc"),
    "name" : "Buffy Summers",
    "address" : {
        "visitedAt": ISODate("2020-05-20T11:44:08.327+0000")
    }
}
```

Oops—that's not what we want. Instead of setting only the `visitedAt` field, the `UpdateId` function replaced the entire embedded document.

To understand why this happened, let's inspect the equivalent Mongo command:

```js
db.users.update(
  { _id: ObjectId('5ec50eaaceb41275cce6a0cc') },
  {
    $set: {
      address: {
        visitedAt: ISODate('2020-05-20T11:44:08.327+0000'),
      },
    },
  },
);
```

The command effectively set the `address` field to a _new_ embedded document with a single `visitedAt` field, erasing the other address fields.

## So how do we **partially update** an embedded document?

The Mongo libraries ([mgo](https://github.com/go-mgo/mgo) and [mongo-go-driver](https://github.com/mongodb/mongo-go-driver)) don't provide a way to do this easily with Go structs. But there are some workarounds we can try.

### 1. Copy the existing embedded document

We could copy the old embedded document into the new struct first before running the update command.

```go
user := User{
  ID:   ObjectIDHex("5ec50eaaceb41275cce6a0cc"),
  Name: "Buffy Summers",
  Address: Address{
    Street: "1630 Revello Drive",
    City:   "Sunnydale",
    State:  "CA",
  },
}

db.C("users").UpdateId(id, User{
  Address: {
    Street: user.Address.Street,
    City:   user.Address.City,
    State:  user.Address.State,
    VisitedAt: time.Now().UTC(),
  },
})
```

This would update the `visitedAt` field and preserve the other fields we wish to leave unchanged.

#### Limitations

- If we don't have the existing embedded document on-hand, we need to make a query to get it first.
- If the document we have is stale and the nested fields have changed **_after_** we retrieved them but **_before_** the update, we would revert those fields to their previous, now-incorrect values.

### 2. Flatten the document

An alternative is to not use embedded documents altogether. In our case, we would merge the `Address` fields into the `User` field.

```go
type User struct {
  ID               bson.ObjectID `bson:"_id,omitempty"`
  Name             string        `bson:"name,omitempty"`
  AddressStreet    string        `bson:"addressStreet,omitempty"`
  AddressCity      string        `bson:"addressCity,omitempty"`
  AddresState      string        `bson:"addressState,omitempty"`
  AddressVisitedAt time.Time     `bson:"addressVisitedAt,omitempty"`
}
```

#### Limitations

- Depending on the application and whether or not we have existing data, changing the document schema may not be feasible.
- We would also miss out on the advantages embedding provides, like reusability. For example, to add a secondary address to the user struct, we would simply add a single `SecondaryAddress` field with the same `Address` struct type, instead of duplicating all four address fields.

### 3. Inline the embedded document

The [inline struct tag](https://pkg.go.dev/go.mongodb.org/mongo-driver/bson/bsoncodec?tab=doc#StructTags) tells the mongo library to treat the fields of the tagged struct as part of the outer struct. With this tag, the document retains a nested structure in the application code but lives as a flattened document in the Mongo collection.

```go
type User struct {
  ID      bson.ObjectID `bson:"_id,omitempty"`
  Name    string        `bson:"name,omitempty"`
  Address Address       `bson:"address,inline,omitempty"`
}

type Address struct {
  Street    string    `bson:"addressStreet,omitempty"`
  City      string    `bson:"addressCity,omitempty"`
  State     string    `bson:"addressState,omitempty"`
  VisitedAt time.Time `bson:"addressVisitedAt,omitempty"`
}
```

#### Limitations

- The resulting Mongo document is the same as the flattened document in the previous solution, so this also requires a schema change.

### 4. Use a manual update command

We can also manually construct an update document to target specific fields:

```go
db.C("users").UpdateId(id, bson.M{
    "$set": bson.M{"address.visitedAt": time.Now().UTC()},
})
```

#### Limitations

- Though this seems like an easy way to retain the nested structure in the application and database, it becomes increasingly inconvenient with more models and types.

### 5. Auto-generate the update document

To fix the limitation of the manual update method, we can write a function that receives a nested struct and returns an update document containing all the "non-nil" fields.

```go
db.C("users").UpdateId(id, F(User{Address: {VisitedAt: time.Now().UTC()}}))

// F(...) returns:
//
// map[string]interface{}{"address.visitedAt": time.Time{...}}
```

## FlatBSON

[FlatBSON](https://github.com/chidiwilliams/flatbson) is a Go package I wrote to provide this utility function.

`flatbson.Flatten` recursively iterates through all the fields of a given nested struct and assembles a flattened `map[string]interface{}`. It merges nested field names using dot syntax, e.g. `address.visitedAt`.

It also uses the BSON struct tags in line with the [BSON codec specification](https://pkg.go.dev/go.mongodb.org/mongo-driver/bson/bsoncodec?tab=doc#StructTags). The function supports the BSON name, `omitempty`, `inline`, and `skip` tags.

| Tag       | Description                                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| omitempty | Ignore the field if it's set to the zero value for its type or an empty slice or map.                                                            |
| inline    | Inline the struct field, merging all the child fields to the outer struct. The keys must not conflict with the bson keys of other struct fields. |
| skip      | Skip the struct field by setting "-" for the tag name.                                                                                           |

The package uses reflection and is compatible with both the `mgo` and `mongo-go-driver` libraries.

---

Thank you for reading. If you liked this post, please leave a ❤️ or a comment below.

Thanks to [icza](https://stackoverflow.com/users/1705598/icza), whose [Stack Overflow answer](https://stackoverflow.com/a/50561535/9830227) inspired the package. And thanks to [Ope](https://opeonikute.dev) for reading initial drafts of this post.
