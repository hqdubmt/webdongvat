db.createUser(
    {
        user: "001",
        pwd: "123456",
        roles: [
            {
                role: "readWrite",
                db: "mongo_du"
            }
        ]
    }
);

db.createUser(
    {
        user: "002",
        pwd: "123456",
        roles: [
            {
                role: "read",
                db: "mongo_du"
            }
        ]
    }
)


print("User created successfully")